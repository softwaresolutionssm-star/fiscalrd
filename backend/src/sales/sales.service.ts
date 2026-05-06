import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { todayDR } from '../common/utils/date.utils';
import { Sale, SaleStatus } from './entities/sale.entity';
import { SaleItem } from './entities/sale-item.entity';
import { CreateSaleDto } from './dto/create-sale.dto';
import { NcfSequencesService } from '../ncf-sequences/ncf-sequences.service';
import { AccountsReceivable, ArStatus } from '../accounts-receivable/entities/accounts-receivable.entity';
import { InventoryMovement, MovementType, MovementReason } from '../inventory/entities/inventory-movement.entity';
import { NcfType } from '../common/enums/ncf-type.enum';
import { Tenant } from '../tenants/entities/tenant.entity';
import { PlatformSetting } from '../admin/entities/platform-setting.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Product } from '../products/entities/product.entity';
import { AccountingService } from '../accounting/accounting.service';
import { MailService } from '../mail/mail.service';
import { ConfigService } from '@nestjs/config';
import { CashRegisterService } from '../cash-register/cash-register.service';
import { AlanubeService } from '../alanube/alanube.service';
import { PLAN_LIMITS, PLAN_LABELS, TenantPlan } from '../common/enums/plan.enum';
import { AuditLogService } from '../audit-log/audit-log.service';

export interface ReturnItemDto {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  itbisRate: number;
}

@Injectable()
export class SalesService {
  private readonly logger = new Logger(SalesService.name);

  constructor(
    @InjectRepository(Sale)
    private readonly salesRepo: Repository<Sale>,
    @InjectRepository(SaleItem)
    private readonly saleItemsRepo: Repository<SaleItem>,
    @InjectRepository(AccountsReceivable)
    private readonly arRepo: Repository<AccountsReceivable>,
    @InjectRepository(InventoryMovement)
    private readonly inventoryRepo: Repository<InventoryMovement>,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(PlatformSetting)
    private readonly settingRepo: Repository<PlatformSetting>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    private readonly ncfSequencesService: NcfSequencesService,
    private readonly accountingService: AccountingService,
    private readonly mailService: MailService,
    private readonly config: ConfigService,
    private readonly cashRegisterService: CashRegisterService,
    private readonly alanubeService: AlanubeService,
    private readonly auditLog: AuditLogService,
  ) {}

  async create(tenantId: string, dto: CreateSaleDto, branchId: string | null = null): Promise<Sale> {
    // Calculate items
    const items = dto.items.map((itemDto) => {
      const itbisRate = itemDto.itbisRate ?? 18;
      const discountPct = itemDto.discountPct ?? 0;
      const baseSubtotal = Number(itemDto.unitPrice) * Number(itemDto.quantity);
      const discountAmount = Math.round(baseSubtotal * (discountPct / 100) * 100) / 100;
      const subtotal = Math.round((baseSubtotal - discountAmount) * 100) / 100;
      const itbisAmount = Math.round(subtotal * (itbisRate / 100) * 100) / 100;
      const total = subtotal + itbisAmount;
      return this.saleItemsRepo.create({
        productId: itemDto.productId,
        productName: itemDto.productName,
        unitPrice: itemDto.unitPrice,
        quantity: itemDto.quantity,
        discountPct,
        discountAmount,
        itbisRate,
        itbisAmount,
        subtotal,
        total,
      });
    });

    const subtotal = items.reduce((acc, i) => acc + Number(i.subtotal), 0);
    const itbisTotal = items.reduce((acc, i) => acc + Number(i.itbisAmount), 0);
    const total = subtotal + itbisTotal;

    // ─── Validar límite de crédito antes de crear ────────────────────────────
    if (dto.paymentMethod === 'credit' && dto.customerId) {
      const customer = await this.customerRepo.findOne({ where: { id: dto.customerId, tenantId } });
      if (customer && Number(customer.creditLimit) > 0) {
        const openAR = await this.arRepo.find({
          where: { tenantId, customerId: dto.customerId, status: In([ArStatus.PENDING, ArStatus.PARTIAL]) },
        });
        const currentDebt = openAR.reduce((s, ar) => s + Number(ar.balance), 0);
        if (currentDebt + total > Number(customer.creditLimit)) {
          throw new BadRequestException(
            `Límite de crédito excedido: ${customer.name} tiene RD$${currentDebt.toFixed(2)} pendiente de un límite de RD$${Number(customer.creditLimit).toFixed(2)}. Disponible: RD$${Math.max(0, Number(customer.creditLimit) - currentDebt).toFixed(2)}.`,
          );
        }
      }
    }

    const sale = this.salesRepo.create({
      tenantId,
      branchId: branchId ?? null,
      customerId: dto.customerId,
      customerName: dto.customerName,
      customerRncCedula: dto.customerRncCedula,
      ncfType: dto.ncfType,
      saleDate: dto.saleDate as unknown as Date,
      paymentMethod: dto.paymentMethod ?? 'cash',
      paymentSplits: dto.paymentSplits ?? null,
      dueDate: dto.dueDate ? dto.dueDate as unknown as Date : undefined,
      notes: dto.notes,
      subtotal: Math.round(subtotal * 100) / 100,
      itbisTotal: Math.round(itbisTotal * 100) / 100,
      total: Math.round(total * 100) / 100,
      items,
    });

    const savedSale = await this.salesRepo.save(sale);

    // Auto-create accounts-receivable entry for credit sales
    if (dto.paymentMethod === 'credit' && dto.customerId) {
      const dueDate = dto.dueDate
        ? new Date(dto.dueDate)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // default 30 days

      const ar = this.arRepo.create({
        tenantId,
        customerId: dto.customerId,
        customerName: dto.customerName,
        saleId: savedSale.id,
        issueDate: new Date(dto.saleDate),
        dueDate,
        amount: savedSale.total,
        balance: savedSale.total,
        status: ArStatus.PENDING,
        notes: dto.notes,
      });
      await this.arRepo.save(ar);
    }

    return savedSale;
  }

  async findAll(tenantId: string, branchId: string | null = null): Promise<Sale[]> {
    const where: any = { tenantId };
    if (branchId !== null) where.branchId = branchId;
    return this.salesRepo.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, tenantId: string): Promise<Sale> {
    const sale = await this.salesRepo.findOne({ where: { id, tenantId }, relations: ['items'] });
    if (!sale) throw new NotFoundException(`Venta ${id} no encontrada`);
    return sale;
  }

  async sendInvoiceEmail(id: string, tenantId: string, customerEmail: string): Promise<void> {
    const sale = await this.findOne(id, tenantId);
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant no encontrado');

    const frontendUrl = this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
    const invoiceUrl = `${frontendUrl}/dashboard/sales/${sale.id}`;

    await this.mailService.sendInvoice(customerEmail, {
      businessName: tenant.businessName,
      rnc: tenant.rnc,
      ncfNumber: sale.ncfNumber,
      ncfType: sale.ncfType,
      saleDate: String(sale.saleDate),
      customerName: sale.customerName,
      total: Number(sale.total),
      subtotal: Number(sale.subtotal),
      itbisTotal: Number(sale.itbisTotal),
      paymentMethod: sale.paymentMethod,
      items: sale.items.map(i => ({
        productName: i.productName,
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
        total: Number(i.total),
      })),
      invoiceUrl,
    });
  }

  async createReturn(id: string, tenantId: string, items: ReturnItemDto[], notes?: string): Promise<Sale> {
    const original = await this.findOne(id, tenantId);
    if (original.status !== SaleStatus.ISSUED) {
      throw new BadRequestException('Solo se pueden devolver ventas emitidas');
    }

    const returnItems = items.map(item => {
      const subtotal = Math.round(item.unitPrice * item.quantity * 100) / 100;
      const itbisAmount = Math.round(subtotal * (item.itbisRate / 100) * 100) / 100;
      return this.saleItemsRepo.create({
        productId: item.productId,
        productName: item.productName,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        discountPct: 0,
        discountAmount: 0,
        itbisRate: item.itbisRate,
        itbisAmount,
        subtotal,
        total: subtotal + itbisAmount,
      });
    });

    const subtotal = returnItems.reduce((acc, i) => acc + Number(i.subtotal), 0);
    const itbisTotal = returnItems.reduce((acc, i) => acc + Number(i.itbisAmount), 0);
    const total = subtotal + itbisTotal;

    const creditNote = this.salesRepo.create({
      tenantId,
      customerId: original.customerId,
      customerName: original.customerName,
      customerRncCedula: original.customerRncCedula,
      ncfType: NcfType.E34,
      relatedNcf: original.ncfNumber ?? original.id,
      saleDate: new Date(),
      paymentMethod: original.paymentMethod,
      subtotal: Math.round(subtotal * 100) / 100,
      itbisTotal: Math.round(itbisTotal * 100) / 100,
      total: Math.round(total * 100) / 100,
      notes: notes ?? `Devolución de ${original.ncfNumber ?? original.id}`,
      items: returnItems,
    });

    const saved = await this.salesRepo.save(creditNote);

    // Assign E34 NCF and set as ISSUED
    saved.ncfNumber = await this.ncfSequencesService.getNextNcf(tenantId, NcfType.E34);
    saved.status = SaleStatus.ISSUED;
    const issued = await this.salesRepo.save(saved);

    // Create inventory IN movements for returned items
    const today = todayDR();
    const movements = items
      .filter(item => item.productId)
      .map(item =>
        this.inventoryRepo.create({
          tenantId,
          branchId: original.branchId ?? null,
          productId: item.productId,
          productName: item.productName,
          type: MovementType.IN,
          reason: MovementReason.RETURN,
          quantity: item.quantity,
          reference: issued.id,
          notes: `Devolución ${issued.ncfNumber}`,
          movementDate: today as unknown as Date,
        })
      );
    if (movements.length > 0) await this.inventoryRepo.save(movements);

    return issued;
  }

  async cancel(id: string, tenantId: string, userId?: string): Promise<Sale> {
    const sale = await this.findOne(id, tenantId);
    if (sale.status === SaleStatus.CANCELLED) {
      throw new BadRequestException('La venta ya está cancelada');
    }
    sale.status = SaleStatus.CANCELLED;
    const saved = await this.salesRepo.save(sale);
    this.auditLog.log({ tenantId, userId, action: 'SALE_CANCELLED', entity: 'sale', entityId: id, details: { ncfNumber: sale.ncfNumber, total: sale.total } });
    return saved;
  }

  async issue(id: string, tenantId: string, userId?: string): Promise<Sale> {
    const sale = await this.findOne(id, tenantId);
    if (sale.status !== SaleStatus.DRAFT) {
      throw new BadRequestException('Solo se pueden emitir ventas en estado borrador');
    }

    // ─── Verificar límite de facturas del plan ───────────────────
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (tenant) {
      const plan = (tenant.plan as TenantPlan) ?? TenantPlan.FREE;
      const limit = PLAN_LIMITS[plan];
      if (limit.invoices < 999999999) {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        const monthCount = await this.salesRepo.createQueryBuilder('s')
          .where('s.tenantId = :tenantId', { tenantId })
          .andWhere('s.status = :status', { status: SaleStatus.ISSUED })
          .andWhere('s.createdAt >= :start', { start })
          .andWhere('s.createdAt <= :end', { end })
          .getCount();
        if (monthCount >= limit.invoices) {
          throw new BadRequestException(
            `Límite alcanzado: tu plan ${PLAN_LABELS[plan]} permite ${limit.invoices} facturas por mes. Actualiza tu plan para continuar.`,
          );
        }
      }
    }

    // Asignar NCF automáticamente
    const ncfType = sale.ncfType;
    sale.ncfNumber = await this.ncfSequencesService.getNextNcf(tenantId, ncfType);
    sale.status = SaleStatus.ISSUED;

    // Vincular a la sesión de caja activa del usuario
    if (userId) {
      const session = await this.cashRegisterService.getCurrentOrNull(tenantId, userId);
      if (session) sale.cashRegisterSessionId = session.id;
    }

    const saved = await this.salesRepo.save(sale);

    // Auto-create inventory OUT movements for items with a known productId
    const today = todayDR();
    const movements = sale.items
      .filter(item => item.productId)
      .map(item =>
        this.inventoryRepo.create({
          tenantId,
          branchId: sale.branchId ?? null,
          productId: item.productId,
          productName: item.productName,
          type: MovementType.OUT,
          reason: MovementReason.SALE,
          quantity: item.quantity,
          reference: sale.id,
          notes: `Venta ${sale.ncfNumber ?? sale.id}`,
          movementDate: today as unknown as Date,
        })
      );
    if (movements.length > 0) await this.inventoryRepo.save(movements);

    // ─── COGS: calcular costo de ventas para contabilidad ────────────────────
    let cogsCost = 0;
    const productIds = sale.items.filter(i => i.productId).map(i => i.productId);
    if (productIds.length > 0) {
      const products = await this.productRepo.findByIds(productIds);
      const costMap = new Map(products.map(p => [p.id, Number(p.costPrice ?? 0)]));
      for (const item of sale.items) {
        const cost = costMap.get(item.productId) ?? 0;
        if (cost > 0) {
          const itemCost = Math.round(cost * Number(item.quantity) * 100) / 100;
          cogsCost += itemCost;
          // Snapshot cost in the item (already saved, update silently)
          await this.saleItemsRepo.update(item.id, { costPrice: cost });
        }
      }
    }

    // ─── Asiento contable automático ─────────────────────────────────────────
    this.accountingService.autoPostSaleJournal(tenantId, {
      id: saved.id,
      ncfNumber: saved.ncfNumber,
      customerName: saved.customerName,
      subtotal: Number(saved.subtotal),
      itbisTotal: Number(saved.itbisTotal),
      total: Number(saved.total),
      paymentMethod: saved.paymentMethod,
      saleDate: saved.saleDate,
      cogsCost: cogsCost > 0 ? cogsCost : undefined,
    }).catch(() => {});

    // ─── Enviar a Alanube / DGII (no falla la venta si Alanube falla) ─────────
    await this.sendToAlanube(saved, tenant);

    // ─── Email de factura al cliente (no bloquea si falla) ───────────────────
    this.autoSendInvoiceEmail(saved, tenant).catch(() => {});

    // ─── Audit log ────────────────────────────────────────────────────────────
    this.auditLog.log({ tenantId, userId, action: 'SALE_ISSUED', entity: 'sale', entityId: saved.id, details: { ncfNumber: saved.ncfNumber, total: saved.total, customerName: saved.customerName } });

    return saved;
  }

  private async sendToAlanube(sale: Sale, tenant: Tenant | null): Promise<void> {
    if (!tenant) return;

    // Determinar API key: primero del tenant, luego la global en settings
    let apiKey = tenant.alanubeApiKey ?? null;
    if (!apiKey) {
      const globalKey = await this.settingRepo.findOne({ where: { key: 'alanube_api_key_global' } });
      apiKey = globalKey?.value ?? null as any;
    }
    if (!apiKey) {
      this.logger.warn(`Alanube: no hay API key para tenant ${tenant.businessName} — factura guardada solo localmente`);
      return;
    }

    // Determinar sandbox: tenant primero, luego setting global
    let sandbox = tenant.alanubeSandbox;
    const globalSandbox = await this.settingRepo.findOne({ where: { key: 'alanube_sandbox' } });
    if (globalSandbox?.value !== undefined) sandbox = globalSandbox.value === 'true';

    try {
      const result = await this.alanubeService.sendEcf(apiKey, sandbox, {
        issuerRnc:          tenant.rnc,
        issuerName:         tenant.businessName,
        issuerAddress:      (tenant as any).address ?? undefined,
        issuerPhone:        (tenant as any).phone ?? undefined,
        receiverRncCedula:  sale.customerRncCedula ?? undefined,
        receiverName:       sale.customerName ?? 'Consumidor Final',
        ecfType:            sale.ncfType,
        sequence:           sale.ncfNumber ?? '',
        issueDate:          new Date(sale.saleDate).toISOString().split('T')[0],
        relatedNcf:         sale.relatedNcf ?? undefined,
        subtotal:           Number(sale.subtotal),
        itbisTotal:         Number(sale.itbisTotal),
        total:              Number(sale.total),
        paymentMethod:      sale.paymentMethod ?? 'cash',
        paymentSplits:      sale.paymentSplits ?? undefined,
        items: sale.items.map(i => ({
          description:    i.productName,
          quantity:       Number(i.quantity),
          unitOfMeasure:  i.unitOfMeasure ?? 'UND',
          unitPrice:      Number(i.unitPrice),
          itbisRate:      Number(i.itbisRate),
          subtotal:       Number(i.subtotal),
          itbisAmount:    Number(i.itbisAmount),
          total:          Number(i.total),
        })),
      });

      sale.trackId       = result.trackId ?? null;
      sale.dgiiStatus    = result.dgiiStatus ?? 'PENDIENTE';
      sale.alanubeSentAt = new Date();
      sale.securityCode  = result.securityCode ?? null;
      sale.signatureDate = result.signatureDate ? new Date(result.signatureDate) : null;
      await this.salesRepo.save(sale);

      this.logger.log(`e-CF enviado: ${sale.ncfNumber} → trackId=${result.trackId} status=${result.dgiiStatus}`);
    } catch (e: any) {
      this.logger.error(`Error enviando a Alanube (no crítico): ${e?.message}`);
      // No lanzamos el error — la factura ya está emitida localmente
    }
  }

  async retryAlanube(id: string, tenantId: string): Promise<Sale> {
    const sale = await this.salesRepo.findOne({ where: { id, tenantId }, relations: ['items'] });
    if (!sale) throw new NotFoundException(`Venta ${id} no encontrada`);
    if (sale.status !== SaleStatus.ISSUED) throw new BadRequestException('Solo se puede reintentar ventas emitidas');
    if (sale.dgiiStatus === 'ACEPTADO') throw new BadRequestException('El e-CF ya fue aceptado por la DGII');
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    await this.sendToAlanube(sale, tenant);
    return this.findOne(id, tenantId);
  }

  async findPublic(id: string): Promise<object> {
    const sale = await this.salesRepo.findOne({
      where: { id },
      relations: ['items'],
    });
    if (!sale || sale.status !== SaleStatus.ISSUED) throw new NotFoundException('Factura no encontrada');

    const tenant = await this.tenantRepo.findOne({ where: { id: sale.tenantId } });

    return {
      id: sale.id,
      ncfNumber: sale.ncfNumber,
      ncfType: sale.ncfType,
      saleDate: sale.saleDate,
      customerName: sale.customerName,
      customerRncCedula: sale.customerRncCedula,
      subtotal: Number(sale.subtotal),
      itbisTotal: Number(sale.itbisTotal),
      total: Number(sale.total),
      paymentMethod: sale.paymentMethod,
      dgiiStatus: sale.dgiiStatus,
      securityCode: sale.securityCode ?? null,
      signatureDate: sale.signatureDate ?? null,
      items: sale.items.map(i => ({
        productName:    i.productName,
        quantity:       Number(i.quantity),
        unitOfMeasure:  i.unitOfMeasure ?? 'UND',
        unitPrice:      Number(i.unitPrice),
        itbisRate:      Number(i.itbisRate ?? 0),
        itbisAmount:    Number(i.itbisAmount ?? 0),
        subtotal:       Number(i.subtotal ?? 0),
        total:          Number(i.total),
      })),
      issuer: tenant ? {
        name:    tenant.businessName,
        rnc:     tenant.rnc,
        address: (tenant as any).address,
        phone:   (tenant as any).phone,
        logoUrl: (tenant as any).logoUrl ?? null,
      } : null,
    };
  }

  async syncDgiiStatus(id: string, tenantId: string): Promise<Sale> {
    const sale = await this.findOne(id, tenantId);
    if (!sale.trackId) throw new BadRequestException('Esta factura no tiene trackId de Alanube');
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant no encontrado');

    let apiKey = tenant.alanubeApiKey ?? null;
    if (!apiKey) {
      const globalKey = await this.settingRepo.findOne({ where: { key: 'alanube_api_key_global' } });
      apiKey = globalKey?.value ?? (null as any);
    }
    if (!apiKey) throw new BadRequestException('No hay API key de Alanube configurada');

    let sandbox = tenant.alanubeSandbox;
    const globalSandbox = await this.settingRepo.findOne({ where: { key: 'alanube_sandbox' } });
    if (globalSandbox?.value !== undefined) sandbox = globalSandbox.value === 'true';

    const result = await this.alanubeService.getEcfStatus(apiKey, sandbox, sale.trackId);
    if (result.dgiiStatus) {
      sale.dgiiStatus = result.dgiiStatus;
      await this.salesRepo.save(sale);
    }
    return this.findOne(id, tenantId);
  }

  async syncOfflineSales(
    tenantId: string,
    _userId: string,
    sales: any[],
  ): Promise<{ synced: number; skipped: number; errors: number }> {
    let synced = 0, skipped = 0, errors = 0;

    for (const s of sales) {
      try {
        // Idempotency: skip if NCF already exists
        const existing = await this.salesRepo.findOne({ where: { tenantId, ncfNumber: s.ncfNumber } });
        if (existing) { skipped++; continue; }

        const items = (s.items ?? []).map((i: any) =>
          this.saleItemsRepo.create({
            productId: i.productId,
            productName: i.productName,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            discountPct: 0,
            discountAmount: 0,
            itbisRate: i.itbisRate ?? 0,
            itbisAmount: i.itbisAmount ?? 0,
            subtotal: i.subtotal,
            total: i.total,
          }),
        );

        const sale = this.salesRepo.create({
          tenantId,
          ncfNumber: s.ncfNumber,
          ncfType: s.ncfType,
          saleDate: new Date(s.saleDate),
          customerName: s.customerName,
          customerRncCedula: s.customerRncCedula ?? undefined,
          customerId: s.customerId ?? undefined,
          subtotal: s.subtotal,
          itbisTotal: s.itbisTotal,
          total: s.total,
          paymentMethod: s.paymentMethod ?? 'cash',
          status: SaleStatus.ISSUED,
          items,
        });

        const saved = await this.salesRepo.save(sale);

        // Create inventory OUT movements
        const today = todayDR();
        const movements = (s.items ?? [])
          .filter((i: any) => i.productId)
          .map((i: any) =>
            this.inventoryRepo.create({
              tenantId,
              productId: i.productId,
              productName: i.productName,
              type: MovementType.OUT,
              reason: MovementReason.SALE,
              quantity: i.quantity,
              reference: saved.id,
              notes: `Venta offline ${s.ncfNumber}`,
              movementDate: today as unknown as Date,
            }),
          );
        if (movements.length > 0) await this.inventoryRepo.save(movements);

        synced++;
      } catch {
        errors++;
      }
    }

    return { synced, skipped, errors };
  }

  // ─── Email de factura al cliente (auto al emitir) ────────────────────────────
  private async autoSendInvoiceEmail(sale: Sale, tenant: Tenant | null): Promise<void> {
    if (!tenant || !sale.customerId) return;
    const customer = await this.customerRepo.findOne({ where: { id: sale.customerId, tenantId: tenant.id } });
    if (!customer?.email) return;

    const frontendUrl = this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
    await this.mailService.sendInvoice(customer.email, {
      businessName: tenant.businessName,
      rnc: tenant.rnc ?? '',
      ncfNumber: sale.ncfNumber ?? undefined,
      ncfType: sale.ncfType,
      saleDate: sale.saleDate ? new Date(sale.saleDate).toISOString() : new Date().toISOString(),
      customerName: sale.customerName ?? customer.name,
      total: Number(sale.total),
      subtotal: Number(sale.subtotal),
      itbisTotal: Number(sale.itbisTotal),
      paymentMethod: sale.paymentMethod ?? undefined,
      items: (sale.items ?? []).map(i => ({
        productName: i.productName,
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
        total: Number(i.total),
      })),
      invoiceUrl: `${frontendUrl}/dashboard/sales/${sale.id}`,
    });
    this.logger.log(`Email de factura enviado a ${customer.email} para venta ${sale.ncfNumber ?? sale.id}`);
  }
}
