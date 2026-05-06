import { Injectable, BadRequestException, OnModuleInit } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { todayDR } from '../common/utils/date.utils';
import { InventoryMovement, MovementType, MovementReason } from './entities/inventory-movement.entity';
import { CreateMovementDto } from './dto/create-movement.dto';
import { Product } from '../products/entities/product.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Branch } from '../branches/entities/branch.entity';
import { MailService } from '../mail/mail.service';

export interface StockLevel {
  productId: string;
  productName: string;
  currentStock: number;
  totalIn: number;
  totalOut: number;
  branchId?: string | null;
  branchName?: string | null;
}

@Injectable()
export class InventoryService implements OnModuleInit {
  constructor(
    @InjectRepository(InventoryMovement)
    private readonly movementRepo: Repository<InventoryMovement>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
    private readonly mailService: MailService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  /** Al arrancar: reparar movimientos con branchId=null cuya compra sí tiene branchId */
  async onModuleInit() {
    try {
      const result = await this.dataSource.query(`
        UPDATE inventory_movements im
        SET "branchId" = p."branchId"
        FROM purchases p
        WHERE im.reference ~ '^[0-9a-f-]{36}$'
          AND im.reference::uuid = p.id
          AND im."branchId" IS NULL
          AND p."branchId" IS NOT NULL
          AND im."deletedAt" IS NULL
      `);
      const count = Array.isArray(result) ? result[1] : (result?.rowCount ?? 0);
      if (count > 0) {
        console.log(`[InventoryService] Reparados ${count} movimientos huérfanos (branchId=null → branchId de su compra)`);
      }
    } catch (err) {
      console.error('[InventoryService] Error en reparación de movimientos huérfanos:', err);
    }
  }

  async createMovement(tenantId: string, dto: CreateMovementDto, branchId: string | null = null): Promise<InventoryMovement> {
    const movement = this.movementRepo.create({
      tenantId,
      branchId,
      productId: dto.productId,
      productName: dto.productName,
      type: dto.type,
      reason: dto.reason,
      quantity: dto.quantity,
      unitCost: dto.unitCost,
      reference: dto.reference,
      notes: dto.notes,
      movementDate: dto.movementDate as unknown as Date,
    });
    return this.movementRepo.save(movement);
  }

  async getStockLevels(tenantId: string, branchId: string | null = null): Promise<StockLevel[]> {
    let movements: InventoryMovement[];

    if (branchId !== null) {
      // Busca movimientos de esta sucursal (incluye branchId=null del mismo tenant como fallback)
      movements = await this.dataSource.query(`
        SELECT m.* FROM inventory_movements m
        LEFT JOIN purchases p ON m.reference ~ '^[0-9a-f-]{36}$' AND p.id = m.reference::uuid
        WHERE m."tenantId" = $1
          AND m."deletedAt" IS NULL
          AND (
            m."branchId" = $2
            OR (m."branchId" IS NULL AND p."branchId" = $2)
          )
      `, [tenantId, branchId]);
    } else {
      movements = await this.movementRepo.find({ where: { tenantId } });
    }

    // When viewing all branches, group by (branchId, productId) so each branch shows its own stock
    const perBranch = branchId === null;

    let branchNameMap = new Map<string, string>();
    if (perBranch) {
      const branches = await this.branchRepo.find({ where: { tenantId } });
      branches.forEach(b => branchNameMap.set(b.id, b.name));
    }

    const map = new Map<string, { productId: string; productName: string; branchId: string | null; totalIn: number; totalOut: number }>();

    for (const m of movements) {
      const pid = m.productId ?? m.productName;
      const bid = m.branchId;
      const key = perBranch ? `${bid}|${pid}` : pid;
      const entry = map.get(key) ?? { productId: pid, productName: m.productName, branchId: bid, totalIn: 0, totalOut: 0 };
      const qty = Number(m.quantity);
      if (m.type === MovementType.IN || m.type === MovementType.ADJUSTMENT) {
        entry.totalIn += qty;
      } else if (m.type === MovementType.OUT) {
        entry.totalOut += qty;
      }
      map.set(key, entry);
    }

    return Array.from(map.values()).map(data => ({
      productId: data.productId,
      productName: data.productName,
      totalIn: data.totalIn,
      totalOut: data.totalOut,
      currentStock: data.totalIn - data.totalOut,
      ...(perBranch ? {
        branchId: data.branchId,
        branchName: data.branchId ? (branchNameMap.get(data.branchId) ?? data.branchId) : 'Sin sucursal',
      } : {}),
    }));
  }

  async getMovements(tenantId: string, branchId: string | null = null, productId?: string): Promise<(InventoryMovement & { branchName?: string })[]> {
    let movements: InventoryMovement[];

    if (branchId !== null) {
      const params: any[] = [tenantId, branchId];
      let productFilter = '';
      if (productId) {
        params.push(productId);
        productFilter = `AND m."productId" = $${params.length}`;
      }
      movements = await this.dataSource.query(`
        SELECT m.* FROM inventory_movements m
        LEFT JOIN purchases p ON m.reference ~ '^[0-9a-f-]{36}$' AND p.id = m.reference::uuid
        WHERE m."tenantId" = $1
          AND m."deletedAt" IS NULL
          AND (
            m."branchId" = $2
            OR (m."branchId" IS NULL AND p."branchId" = $2)
          )
          ${productFilter}
        ORDER BY m."movementDate" DESC, m."createdAt" DESC
      `, params);
    } else {
      const where: Record<string, any> = { tenantId };
      if (productId) where.productId = productId;
      movements = await this.movementRepo.find({
        where,
        order: { movementDate: 'DESC', createdAt: 'DESC' },
      });
      const branches = await this.branchRepo.find({ where: { tenantId } });
      const nameMap = new Map(branches.map(b => [b.id, b.name]));
      return movements.map(m => Object.assign(m, { branchName: m.branchId ? (nameMap.get(m.branchId) ?? undefined) : undefined }));
    }

    return movements;
  }

  async sendLowStockEmail(tenantId: string): Promise<{ sent: boolean; itemCount: number }> {
    const items = await this.getLowStock(tenantId);
    if (items.length === 0) return { sent: false, itemCount: 0 };
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant?.email) return { sent: false, itemCount: items.length };
    await this.mailService.sendLowStockAlert(tenant.email, tenant.businessName, items);
    return { sent: true, itemCount: items.length };
  }

  async getAlerts(tenantId: string, branchId: string | null = null): Promise<StockLevel[]> {
    const levels = await this.getStockLevels(tenantId, branchId);
    return levels.filter((l) => l.currentStock <= 0);
  }

  async getLowStock(tenantId: string, branchId: string | null = null): Promise<{ productId: string; productName: string; currentStock: number; minStock: number }[]> {
    const levels = await this.getStockLevels(tenantId, branchId);
    const products = await this.productRepo.find({ where: { tenantId, isActive: true, isService: false } });
    const result: { productId: string; productName: string; currentStock: number; minStock: number }[] = [];
    for (const product of products) {
      const level = levels.find(l => l.productId === product.id);
      const currentStock = level?.currentStock ?? 0;
      if (currentStock <= product.minStock) {
        result.push({ productId: product.id, productName: product.name, currentStock, minStock: product.minStock });
      }
    }
    return result;
  }

  // ─── Reparación y diagnóstico ─────────────────────────────────────────────────

  async repairAndDiagnose(tenantId: string, branchId: string | null) {
    // 1. Diagnóstico: cuántos movimientos hay en total y por branchId
    const diagRows = await this.dataSource.query(`
      SELECT "branchId", COUNT(*) as count
      FROM inventory_movements
      WHERE "tenantId" = $1 AND "deletedAt" IS NULL
      GROUP BY "branchId"
    `, [tenantId]);

    // 2. Cuántas compras hay
    const purchaseRows = await this.dataSource.query(`
      SELECT "branchId", COUNT(*) as count
      FROM purchases
      WHERE "tenantId" = $1 AND "deletedAt" IS NULL
      GROUP BY "branchId"
    `, [tenantId]);

    // 3. Reparar: mover branchId=null a la sucursal correcta según la compra
    const repaired1 = await this.dataSource.query(`
      UPDATE inventory_movements im
      SET "branchId" = p."branchId"
      FROM purchases p
      WHERE im.reference ~ '^[0-9a-f-]{36}$'
        AND im.reference::uuid = p.id
        AND im."tenantId" = $1
        AND im."branchId" IS NULL
        AND p."branchId" IS NOT NULL
        AND im."deletedAt" IS NULL
    `, [tenantId]);

    // 4. Crear movimientos faltantes para compras confirmadas que no tienen ninguno
    const purchasesWithoutMovements: any[] = await this.dataSource.query(`
      SELECT p.id, p."branchId", p."supplierName", p."tenantId", p."purchaseDate",
             pi.id as "itemId", pi."productId", pi.description, pi.quantity, pi."unitCost"
      FROM purchases p
      JOIN purchase_items pi ON pi."purchaseId" = p.id
      WHERE p."tenantId" = $1
        AND p."deletedAt" IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM inventory_movements im
          WHERE im.reference ~ '^[0-9a-f-]{36}$'
            AND im.reference::uuid = p.id
            AND im."deletedAt" IS NULL
        )
    `, [tenantId]);

    let created = 0;
    for (const row of purchasesWithoutMovements) {
      const today = (row.purchaseDate instanceof Date ? row.purchaseDate : new Date(row.purchaseDate))
        .toISOString().split('T')[0];
      await this.movementRepo.save(this.movementRepo.create({
        tenantId: row.tenantId,
        branchId: row.branchId ?? null,
        productId: row.productId ?? undefined,
        productName: row.description,
        type: MovementType.IN,
        reason: MovementReason.PURCHASE,
        quantity: Number(row.quantity),
        unitCost: Number(row.unitCost),
        reference: row.id,
        notes: `Compra reparada — ${row.supplierName ?? 'Sin proveedor'}`,
        movementDate: today as unknown as Date,
      }));
      created++;
    }

    // 5. Reparar otra vez por si los movimientos recién creados tienen branchId=null
    await this.dataSource.query(`
      UPDATE inventory_movements im
      SET "branchId" = p."branchId"
      FROM purchases p
      WHERE im.reference ~ '^[0-9a-f-]{36}$'
        AND im.reference::uuid = p.id
        AND im."tenantId" = $1
        AND im."branchId" IS NULL
        AND p."branchId" IS NOT NULL
        AND im."deletedAt" IS NULL
    `, [tenantId]);

    console.log(`[InventoryService] repairAndDiagnose tenant=${tenantId} branchId=${branchId}`, {
      diagRows, purchaseRows, created,
    });

    return {
      diagnosis: { movements: diagRows, purchases: purchaseRows },
      repaired: repaired1?.[1] ?? 0,
      movementsCreated: created,
    };
  }

  // ─── Transferencia entre sucursales ──────────────────────────────────────────

  async transferBetweenBranches(
    tenantId: string,
    dto: {
      fromBranchId: string;
      toBranchId: string;
      productId: string;
      productName: string;
      quantity: number;
      notes?: string;
    },
  ): Promise<{ out: InventoryMovement; in: InventoryMovement }> {
    if (dto.fromBranchId === dto.toBranchId) {
      throw new BadRequestException('El origen y destino no pueden ser la misma sucursal');
    }
    if (dto.quantity <= 0) {
      throw new BadRequestException('La cantidad debe ser mayor a 0');
    }

    // Verificar stock suficiente en origen
    const stockFrom = await this.getStockLevels(tenantId, dto.fromBranchId);
    const level = stockFrom.find(s => s.productId === dto.productId);
    if (!level || level.currentStock < dto.quantity) {
      throw new BadRequestException(
        `Stock insuficiente en sucursal origen. Disponible: ${level?.currentStock ?? 0}`,
      );
    }

    const transferId = randomUUID();
    const today = todayDR();

    const outMovement = await this.movementRepo.save(
      this.movementRepo.create({
        tenantId,
        branchId: dto.fromBranchId,
        productId: dto.productId,
        productName: dto.productName,
        type: MovementType.OUT,
        reason: MovementReason.TRANSFER_OUT,
        quantity: dto.quantity,
        transferId,
        targetBranchId: dto.toBranchId,
        notes: dto.notes ?? `Transferencia hacia sucursal`,
        movementDate: today as unknown as Date,
      }),
    );

    const inMovement = await this.movementRepo.save(
      this.movementRepo.create({
        tenantId,
        branchId: dto.toBranchId,
        productId: dto.productId,
        productName: dto.productName,
        type: MovementType.IN,
        reason: MovementReason.TRANSFER_IN,
        quantity: dto.quantity,
        transferId,
        targetBranchId: dto.fromBranchId,
        notes: dto.notes ?? `Transferencia desde sucursal`,
        movementDate: today as unknown as Date,
      }),
    );

    return { out: outMovement, in: inMovement };
  }

  async getTransferHistory(tenantId: string, branchId: string | null = null): Promise<InventoryMovement[]> {
    const qb = this.movementRepo.createQueryBuilder('m')
      .where('m.tenantId = :tenantId', { tenantId })
      .andWhere('m.reason IN (:...reasons)', { reasons: [MovementReason.TRANSFER_OUT, MovementReason.TRANSFER_IN] })
      .andWhere('m.deletedAt IS NULL')
      .orderBy('m.movementDate', 'DESC')
      .addOrderBy('m.createdAt', 'DESC');

    if (branchId) {
      qb.andWhere('(m.branchId = :branchId OR m.targetBranchId = :branchId)', { branchId });
    }

    return qb.getMany();
  }
}
