import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { ServiceOrder, ServiceOrderStatus } from './entities/service-order.entity';
import { CreateServiceOrderDto, UpdateServiceOrderDto } from './dto/create-service-order.dto';

@Injectable()
export class ServiceOrdersService {
  constructor(
    @InjectRepository(ServiceOrder)
    private readonly repo: Repository<ServiceOrder>,
  ) {}

  private async nextOrderNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.repo.count({ where: { tenantId } });
    return `SO-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  private calcTotal(items: any[], laborCost: number): { totalParts: number; totalAmount: number } {
    const totalParts = (items ?? []).reduce((s: number, i: any) => s + Number(i.total ?? 0), 0);
    const totalAmount = Math.round((totalParts + Number(laborCost ?? 0)) * 100) / 100;
    return { totalParts: Math.round(totalParts * 100) / 100, totalAmount };
  }

  async create(tenantId: string, dto: CreateServiceOrderDto, branchId: string | null = null): Promise<ServiceOrder> {
    const { totalParts, totalAmount } = this.calcTotal(dto.items ?? [], dto.laborCost ?? 0);
    const data: DeepPartial<ServiceOrder> = {
      tenantId, branchId: branchId ?? null,
      orderNumber: await this.nextOrderNumber(tenantId),
      customerId: dto.customerId,
      customerName: dto.customerName,
      customerPhone: dto.customerPhone ?? null,
      vehicleInfo: dto.vehicleInfo ?? null,
      problemDescription: dto.problemDescription,
      internalNotes: dto.internalNotes ?? null,
      assignedEmployeeId: dto.assignedEmployeeId ?? null,
      assignedEmployeeName: dto.assignedEmployeeName ?? null,
      items: dto.items ?? [],
      laborCost: dto.laborCost ?? 0,
      totalParts,
      totalAmount,
      estimatedDelivery: dto.estimatedDelivery ? new Date(dto.estimatedDelivery) as any : null,
    };
    const order = this.repo.create(data);
    return this.repo.save(order);
  }

  async findAll(tenantId: string, branchId?: string | null): Promise<ServiceOrder[]> {
    const where: any = { tenantId };
    if (branchId) where.branchId = branchId;
    return this.repo.find({ where, order: { createdAt: 'DESC' } });
  }

  async findOne(id: string, tenantId: string): Promise<ServiceOrder> {
    const o = await this.repo.findOne({ where: { id, tenantId } });
    if (!o) throw new NotFoundException('Orden no encontrada');
    return o;
  }

  async update(id: string, tenantId: string, dto: UpdateServiceOrderDto): Promise<ServiceOrder> {
    const o = await this.findOne(id, tenantId);
    if (dto.status !== undefined) o.status = dto.status as ServiceOrderStatus;
    if (dto.assignedEmployeeId !== undefined) o.assignedEmployeeId = dto.assignedEmployeeId;
    if (dto.assignedEmployeeName !== undefined) o.assignedEmployeeName = dto.assignedEmployeeName;
    if (dto.internalNotes !== undefined) o.internalNotes = dto.internalNotes;
    if (dto.problemDescription !== undefined) o.problemDescription = dto.problemDescription;
    if (dto.vehicleInfo !== undefined) o.vehicleInfo = dto.vehicleInfo;
    if (dto.items !== undefined) {
      o.items = dto.items;
      const { totalParts, totalAmount } = this.calcTotal(dto.items, dto.laborCost ?? Number(o.laborCost));
      o.totalParts = totalParts;
      o.totalAmount = totalAmount;
    }
    if (dto.laborCost !== undefined) {
      o.laborCost = dto.laborCost;
      const { totalParts, totalAmount } = this.calcTotal(o.items, dto.laborCost);
      o.totalParts = totalParts;
      o.totalAmount = totalAmount;
    }
    if (dto.estimatedDelivery !== undefined) o.estimatedDelivery = new Date(dto.estimatedDelivery) as any;
    if (dto.saleId !== undefined) o.saleId = dto.saleId;
    if (dto.status === ServiceOrderStatus.DELIVERED) o.deliveredAt = new Date();
    return this.repo.save(o);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const o = await this.findOne(id, tenantId);
    await this.repo.softDelete(o.id);
  }

  async stats(tenantId: string): Promise<object> {
    const all = await this.repo.find({ where: { tenantId } });
    const byStatus = {} as Record<string, number>;
    for (const o of all) byStatus[o.status] = (byStatus[o.status] ?? 0) + 1;
    const revenue = all
      .filter(o => [ServiceOrderStatus.COMPLETED, ServiceOrderStatus.DELIVERED].includes(o.status))
      .reduce((s, o) => s + Number(o.totalAmount), 0);
    return { total: all.length, byStatus, revenue: Math.round(revenue * 100) / 100 };
  }
}
