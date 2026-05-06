import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RestaurantTable, TableStatus } from './entities/restaurant-table.entity';
import { TableOrder, TableOrderStatus, TableOrderItem } from './entities/table-order.entity';

@Injectable()
export class RestaurantTablesService {
  constructor(
    @InjectRepository(RestaurantTable) private readonly tableRepo: Repository<RestaurantTable>,
    @InjectRepository(TableOrder)      private readonly orderRepo: Repository<TableOrder>,
  ) {}

  // ─── Tables ──────────────────────────────────────────────────────────────────

  async createTable(tenantId: string, dto: { name: string; capacity?: number; notes?: string }, branchId: string | null = null) {
    const t = this.tableRepo.create({ tenantId, branchId, name: dto.name, capacity: dto.capacity ?? 4, notes: dto.notes });
    return this.tableRepo.save(t);
  }

  async findTables(tenantId: string, branchId?: string | null) {
    const where: any = { tenantId };
    if (branchId) where.branchId = branchId;
    const tables = await this.tableRepo.find({ where, order: { name: 'ASC' } });
    // Enrich with open order summary
    const openOrders = await this.orderRepo.find({ where: { tenantId, status: TableOrderStatus.OPEN } });
    const orderMap = new Map(openOrders.map(o => [o.tableId, o]));
    return tables.map(t => ({ ...t, currentOrder: orderMap.get(t.id) ?? null }));
  }

  async updateTable(id: string, tenantId: string, dto: Partial<{ name: string; capacity: number; status: TableStatus; notes: string }>) {
    const t = await this.tableRepo.findOne({ where: { id, tenantId } });
    if (!t) throw new NotFoundException('Mesa no encontrada');
    Object.assign(t, dto);
    return this.tableRepo.save(t);
  }

  async removeTable(id: string, tenantId: string) {
    const t = await this.tableRepo.findOne({ where: { id, tenantId } });
    if (!t) throw new NotFoundException('Mesa no encontrada');
    await this.tableRepo.softDelete(id);
  }

  // ─── Orders ──────────────────────────────────────────────────────────────────

  private calcTotals(items: TableOrderItem[]) {
    const subtotal    = Math.round(items.reduce((s, i) => s + i.subtotal, 0) * 100) / 100;
    const itbisTotal  = Math.round(items.reduce((s, i) => s + i.itbisAmount, 0) * 100) / 100;
    return { subtotal, itbisTotal };
  }

  async openOrder(tenantId: string, tableId: string, dto: { serverName?: string; guestCount?: number; notes?: string }, branchId: string | null = null) {
    const table = await this.tableRepo.findOne({ where: { id: tableId, tenantId } });
    if (!table) throw new NotFoundException('Mesa no encontrada');

    const existing = await this.orderRepo.findOne({ where: { tableId, tenantId, status: TableOrderStatus.OPEN } });
    if (existing) return existing; // Idempotent

    const order = this.orderRepo.create({
      tenantId, branchId, tableId, tableName: table.name,
      serverName: dto.serverName,
      guestCount: dto.guestCount ?? 1,
      notes: dto.notes,
      items: [], subtotal: 0, itbisTotal: 0, tipAmount: 0, total: 0,
      status: TableOrderStatus.OPEN,
      openedAt: new Date(),
    });
    const saved = await this.orderRepo.save(order);

    table.status = TableStatus.OCCUPIED;
    table.currentOrderId = saved.id;
    await this.tableRepo.save(table);
    return saved;
  }

  async addItem(orderId: string, tenantId: string, item: { productId?: string; productName: string; quantity: number; unitPrice: number; itbisRate?: number; notes?: string }) {
    const order = await this.orderRepo.findOne({ where: { id: orderId, tenantId } });
    if (!order) throw new NotFoundException('Orden no encontrada');
    if (order.status !== TableOrderStatus.OPEN) throw new BadRequestException('La orden ya está cerrada');

    const qty = item.quantity;
    const price = item.unitPrice;
    const itbisRate = item.itbisRate ?? 18;
    const subtotal = Math.round(qty * price * 100) / 100;
    const itbisAmount = Math.round(subtotal * (itbisRate / 100) * 100) / 100;

    // Check if same product already in order — increment quantity
    const existing = order.items.findIndex(i => i.productName === item.productName && !i.notes);
    if (existing >= 0 && !item.notes) {
      const old = order.items[existing];
      const newQty = old.quantity + qty;
      const newSub = Math.round(newQty * old.unitPrice * 100) / 100;
      const newItbis = Math.round(newSub * (old.itbisRate / 100) * 100) / 100;
      order.items[existing] = { ...old, quantity: newQty, subtotal: newSub, itbisAmount: newItbis, total: newSub + newItbis };
    } else {
      order.items = [...order.items, {
        productId: item.productId, productName: item.productName,
        quantity: qty, unitPrice: price, itbisRate, subtotal,
        itbisAmount, total: subtotal + itbisAmount, notes: item.notes,
      }];
    }

    const { subtotal: newSub, itbisTotal } = this.calcTotals(order.items);
    order.subtotal = newSub;
    order.itbisTotal = itbisTotal;
    order.total = Math.round((newSub + itbisTotal + Number(order.tipAmount)) * 100) / 100;
    return this.orderRepo.save(order);
  }

  async removeItem(orderId: string, tenantId: string, itemIndex: number) {
    const order = await this.orderRepo.findOne({ where: { id: orderId, tenantId } });
    if (!order) throw new NotFoundException('Orden no encontrada');
    if (order.status !== TableOrderStatus.OPEN) throw new BadRequestException('La orden ya está cerrada');
    order.items = order.items.filter((_, i) => i !== itemIndex);
    const { subtotal, itbisTotal } = this.calcTotals(order.items);
    order.subtotal = subtotal;
    order.itbisTotal = itbisTotal;
    order.total = Math.round((subtotal + itbisTotal + Number(order.tipAmount)) * 100) / 100;
    return this.orderRepo.save(order);
  }

  async setTip(orderId: string, tenantId: string, tipAmount: number) {
    const order = await this.orderRepo.findOne({ where: { id: orderId, tenantId } });
    if (!order) throw new NotFoundException('Orden no encontrada');
    order.tipAmount = tipAmount;
    order.total = Math.round((Number(order.subtotal) + Number(order.itbisTotal) + tipAmount) * 100) / 100;
    return this.orderRepo.save(order);
  }

  async closeOrder(orderId: string, tenantId: string, dto: { paymentMethod: string; paymentSplits?: any[]; tipAmount?: number }) {
    const order = await this.orderRepo.findOne({ where: { id: orderId, tenantId } });
    if (!order) throw new NotFoundException('Orden no encontrada');
    if (order.status !== TableOrderStatus.OPEN) throw new BadRequestException('La orden ya está cerrada');

    if (dto.tipAmount !== undefined) {
      order.tipAmount = dto.tipAmount;
      order.total = Math.round((Number(order.subtotal) + Number(order.itbisTotal) + dto.tipAmount) * 100) / 100;
    }
    order.status = TableOrderStatus.PAID;
    order.paymentMethod = dto.paymentMethod;
    order.paymentSplits = dto.paymentSplits ?? null;
    order.paidAt = new Date();
    const saved = await this.orderRepo.save(order);

    // Free the table
    const table = await this.tableRepo.findOne({ where: { id: order.tableId, tenantId } });
    if (table) {
      table.status = TableStatus.AVAILABLE;
      table.currentOrderId = null;
      await this.tableRepo.save(table);
    }
    return saved;
  }

  async cancelOrder(orderId: string, tenantId: string) {
    const order = await this.orderRepo.findOne({ where: { id: orderId, tenantId } });
    if (!order) throw new NotFoundException('Orden no encontrada');
    order.status = TableOrderStatus.CANCELLED;
    await this.orderRepo.save(order);
    const table = await this.tableRepo.findOne({ where: { id: order.tableId, tenantId } });
    if (table) { table.status = TableStatus.AVAILABLE; table.currentOrderId = null; await this.tableRepo.save(table); }
    return { success: true };
  }

  async getOrder(orderId: string, tenantId: string) {
    const o = await this.orderRepo.findOne({ where: { id: orderId, tenantId } });
    if (!o) throw new NotFoundException('Orden no encontrada');
    return o;
  }

  async getOrderHistory(tenantId: string, branchId?: string | null) {
    const where: any = { tenantId, status: TableOrderStatus.PAID };
    if (branchId) where.branchId = branchId;
    return this.orderRepo.find({ where, order: { paidAt: 'DESC' }, take: 100 });
  }

  async getDailySummary(tenantId: string, date: string, branchId?: string | null) {
    const where: any = { tenantId, status: TableOrderStatus.PAID };
    if (branchId) where.branchId = branchId;
    const all = await this.orderRepo.find({ where });
    const day = all.filter(o => o.paidAt?.toISOString().startsWith(date));
    const total = day.reduce((s, o) => s + Number(o.total), 0);
    const tips  = day.reduce((s, o) => s + Number(o.tipAmount), 0);
    return { date, count: day.length, total: Math.round(total * 100) / 100, tips: Math.round(tips * 100) / 100 };
  }
}
