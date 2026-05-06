import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { todayDR } from '../common/utils/date.utils';
import { Purchase, PurchaseStatus } from './entities/purchase.entity';
import { PurchaseItem } from './entities/purchase-item.entity';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { InventoryMovement, MovementType, MovementReason } from '../inventory/entities/inventory-movement.entity';
import { AccountingService } from '../accounting/accounting.service';

@Injectable()
export class PurchasesService {
  constructor(
    @InjectRepository(Purchase) private purchaseRepo: Repository<Purchase>,
    @InjectRepository(PurchaseItem) private itemRepo: Repository<PurchaseItem>,
    @InjectRepository(InventoryMovement) private readonly inventoryRepo: Repository<InventoryMovement>,
    private readonly accountingService: AccountingService,
  ) {}

  async create(tenantId: string, dto: CreatePurchaseDto, branchId: string | null = null): Promise<Purchase> {
    const items = dto.items.map(item => {
      const itbisRate = item.itbisRate ?? 18;
      const subtotal = item.quantity * item.unitCost;
      const itbisAmount = subtotal * (itbisRate / 100);
      return this.itemRepo.create({ ...item, itbisRate, subtotal, itbisAmount, total: subtotal + itbisAmount });
    });
    const subtotal = items.reduce((s, i) => s + i.subtotal, 0);
    const itbisTotal = items.reduce((s, i) => s + i.itbisAmount, 0);
    const purchase = this.purchaseRepo.create({
      tenantId, branchId, supplierId: dto.supplierId, supplierName: dto.supplierName,
      supplierRnc: dto.supplierRnc, ncfNumber: dto.ncfNumber, ncfType: dto.ncfType,
      purchaseDate: new Date(dto.purchaseDate), isCredit: dto.isCredit ?? false,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      notes: dto.notes, subtotal, itbisTotal, total: subtotal + itbisTotal, items,
      status: PurchaseStatus.CONFIRMED,
    });
    const saved = await this.purchaseRepo.save(purchase);

    // Auto-create inventory movements — use original items array (saved.items may not be populated by TypeORM)
    if (items.length > 0) {
      const today = todayDR();
      const movements = items.map(item =>
        this.inventoryRepo.create({
          tenantId,
          branchId,
          productId: item.productId ?? undefined,
          productName: item.description,
          type: MovementType.IN,
          reason: MovementReason.PURCHASE,
          quantity: Number(item.quantity),
          unitCost: Number(item.unitCost),
          reference: saved.id,
          notes: `Compra registrada — ${dto.supplierName ?? 'Sin proveedor'}`,
          movementDate: today as unknown as Date,
        })
      );
      try {
        await this.inventoryRepo.save(movements);
      } catch (err) {
        console.error('[PurchasesService] Error al crear movimientos de inventario:', err);
        throw err;
      }
    }

    // Reparar movimientos huérfanos (branchId = null) de compras anteriores de este tenant/sucursal
    if (branchId) {
      await this.repairOrphanedMovements(tenantId, branchId);
    }

    return saved;
  }

  /** Actualiza movimientos con branchId=null cuya compra de referencia pertenece a esta sucursal */
  private async repairOrphanedMovements(tenantId: string, branchId: string): Promise<void> {
    try {
      // Obtener todas las compras de esta sucursal
      const branchPurchases = await this.purchaseRepo.find({
        where: { tenantId, branchId },
        select: ['id'],
      });
      if (branchPurchases.length === 0) return;

      const purchaseIds = branchPurchases.map(p => p.id);

      // Buscar movimientos huérfanos que referencien esas compras
      const orphaned = await this.inventoryRepo.find({
        where: { tenantId, branchId: IsNull() },
      });

      const toFix = orphaned.filter(m => m.reference && purchaseIds.includes(m.reference));
      if (toFix.length === 0) return;

      await Promise.all(
        toFix.map(m => this.inventoryRepo.update(m.id, { branchId })),
      );
      console.log(`[PurchasesService] Reparados ${toFix.length} movimientos huérfanos para sucursal ${branchId}`);
    } catch (err) {
      console.error('[PurchasesService] Error al reparar movimientos huérfanos:', err);
      // No lanzamos, es un proceso secundario
    }
  }

  async confirm(id: string, tenantId: string): Promise<Purchase> {
    const p = await this.purchaseRepo.findOne({ where: { id, tenantId }, relations: ['items'] });
    if (!p) throw new NotFoundException('Compra no encontrada');
    p.status = PurchaseStatus.CONFIRMED;
    const saved = await this.purchaseRepo.save(p);

    // Auto-create inventory IN movements
    const today = todayDR();
    if (p.items?.length > 0) {
      const movements = p.items.map(item =>
        this.inventoryRepo.create({
          tenantId,
          branchId: p.branchId ?? null,
          productId: item.productId ?? undefined,
          productName: item.description,
          type: MovementType.IN,
          reason: MovementReason.PURCHASE,
          quantity: item.quantity,
          unitCost: item.unitCost,
          reference: id,
          notes: `Compra confirmada — ${p.supplierName ?? ''}`,
          movementDate: today as unknown as Date,
        })
      );
      await this.inventoryRepo.save(movements);
    }

    // ─── Asiento contable automático ─────────────────────────────────────────
    this.accountingService.autoPostPurchaseJournal(tenantId, {
      id: p.id,
      supplierName: p.supplierName,
      ncfNumber: p.ncfNumber,
      subtotal: Number(p.subtotal),
      itbisTotal: Number(p.itbisTotal),
      total: Number(p.total),
      isCredit: p.isCredit,
      purchaseDate: p.purchaseDate,
    }).catch(() => {});

    return saved;
  }

  async findAll(tenantId: string, branchId: string | null = null): Promise<Purchase[]> {
    const where: any = { tenantId };
    if (branchId !== null) where.branchId = branchId;
    return this.purchaseRepo.find({ where, relations: ['items'], order: { purchaseDate: 'DESC' } });
  }

  async findOne(id: string, tenantId: string): Promise<Purchase> {
    const p = await this.purchaseRepo.findOne({ where: { id, tenantId }, relations: ['items'] });
    if (!p) throw new NotFoundException('Compra no encontrada');
    return p;
  }

  async report606Data(tenantId: string, year: number, month: number) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);
    const purchases = await this.purchaseRepo.find({
      where: { tenantId, status: PurchaseStatus.CONFIRMED },
    });
    const filtered = purchases.filter(p => {
      const d = new Date(p.purchaseDate);
      return d >= start && d <= end;
    });
    const lines = filtered.map(p => ({
      rnc: p.supplierRnc ?? '', ncfNumber: p.ncfNumber ?? '', ncfType: p.ncfType ?? '',
      date: new Date(p.purchaseDate).toISOString().split('T')[0],
      subtotal: Number(p.subtotal), itbis: Number(p.itbisTotal), total: Number(p.total),
    }));
    const totals = lines.reduce(
      (acc, l) => ({ subtotal: acc.subtotal + l.subtotal, itbis: acc.itbis + l.itbis, total: acc.total + l.total }),
      { subtotal: 0, itbis: 0, total: 0 },
    );
    return { period: `${year}-${String(month).padStart(2, '0')}`, totalRecords: lines.length, totals, lines };
  }
}
