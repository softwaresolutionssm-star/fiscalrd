import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TenantPayment, PaymentStatus } from './entities/tenant-payment.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { PlatformSetting } from '../admin/entities/platform-setting.entity';
import { Branch } from '../branches/entities/branch.entity';
import { PLAN_LIMITS, TenantPlan } from '../common/enums/plan.enum';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';


// Ventana de pago: día 28 del mes del período → día 5 del mes siguiente
const PAYMENT_NOTIFY_DAY  = 28;  // Día del mes en que se envía la notificación "ya puedes pagar"
const PAYMENT_DUE_DAY     = 5;   // Día del mes SIGUIENTE en que vence el pago
const LATE_FEE_PCT        = 10;  // % de recargo por pago tardío (aplica al día 6+)
const BLOCK_AFTER_MONTHS  = 3;   // Meses consecutivos sin pagar para auto-bloqueo

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    @InjectRepository(TenantPayment)   private paymentRepo: Repository<TenantPayment>,
    @InjectRepository(Tenant)          private tenantRepo: Repository<Tenant>,
    @InjectRepository(PlatformSetting) private settingRepo: Repository<PlatformSetting>,
    @InjectRepository(Branch)          private branchRepo: Repository<Branch>,
    private readonly mailService: MailService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Calcula el precio mensual total del tenant.
   * Modelo: planPrice × maxBranches − descuento_opcional.
   * Para maxBranches=999 (ilimitado) se usa el conteo real de sucursales activas.
   */
  private async computeMonthlyTotal(tenant: Tenant, activeBranchCount: number): Promise<number> {
    const planBase = await this.planPrice(tenant.plan as TenantPlan);
    if (planBase === 0) return 0;
    const maxBranches = tenant.maxBranches ?? 1;
    const count = maxBranches === 999 ? Math.max(activeBranchCount, 1) : maxBranches;
    const baseTotal = planBase * count;
    const discountPct = Number(tenant.billingDiscountPct ?? 0);
    if (discountPct > 0) {
      const discount = Math.round(baseTotal * discountPct / 100 * 100) / 100;
      return Math.round((baseTotal - discount) * 100) / 100;
    }
    return baseTotal;
  }

  // ─── HELPERS ────────────────────────────────────────────────────────────────

  private currentPeriod(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  // Vencimiento = día 5 del mes SIGUIENTE al período
  // Ej: período 2026-04 → vence el 05 mayo 2026
  private periodDueDate(period: string): Date {
    const [year, month] = period.split('-').map(Number); // month es 1-based
    // new Date(year, month, day) → month sin restar = mes siguiente (0-based)
    return new Date(year, month, PAYMENT_DUE_DAY);
  }

  // Fecha desde la que se puede pagar = día 28 del mes del período
  private periodNotifyDate(period: string): Date {
    const [year, month] = period.split('-').map(Number);
    return new Date(year, month - 1, PAYMENT_NOTIFY_DAY);
  }

  // Cuenta meses pendientes/vencidos con dueDate ya pasado
  private async countOverdueMonths(tenantId: string): Promise<number> {
    const now = new Date();
    const unpaid = await this.paymentRepo.find({
      where: { tenantId, status: In([PaymentStatus.PENDING, PaymentStatus.OVERDUE]) },
    });
    return unpaid.filter(p => new Date(p.dueDate) < now).length;
  }

  private async planPrice(plan: TenantPlan): Promise<number> {
    const keyMap: Partial<Record<TenantPlan, string>> = {
      [TenantPlan.BASIC]:      'plan_price_basic',
      [TenantPlan.PRO]:        'plan_price_pro',
      [TenantPlan.ENTERPRISE]: 'plan_price_enterprise',
    };
    const key = keyMap[plan];
    if (key) {
      const setting = await this.settingRepo.findOne({ where: { key } });
      if (setting?.value) return Number(setting.value);
    }
    return PLAN_LIMITS[plan]?.price ?? 0;
  }

  /**
   * Genera (o recupera) los pagos del mes actual — UNO POR SUCURSAL ACTIVA.
   * Total global = planPrice × maxBranches − descuento; dividido equitativamente por sucursal.
   */
  async ensureCurrentPayments(tenant: Tenant): Promise<TenantPayment[]> {
    const branches = await this.branchRepo.find({ where: { tenantId: tenant.id, isActive: true } });
    const branchCount = branches.length;
    if (branchCount === 0) return [];

    const totalPrice = await this.computeMonthlyTotal(tenant, branchCount);
    if (totalPrice === 0) return [];

    const period  = this.currentPeriod();
    const dueDate = this.periodDueDate(period);
    const pricePerBranch = Math.round((totalPrice / branchCount) * 100) / 100;

    // Cargar TODOS los pagos del período de una sola vez
    const allPeriodPayments = await this.paymentRepo.find({ where: { tenantId: tenant.id, period } });

    const results: TenantPayment[] = [];

    for (const branch of branches) {
      // Pagos que corresponden a esta sucursal:
      //   - Pagos con branchId exacto, O
      //   - Pagos legacy con branchId=null (solo para la sucursal principal)
      const branchPayments = allPeriodPayments.filter(p =>
        p.branchId === branch.id || (branch.isMain && p.branchId === null),
      );

      // ── REGLA PRINCIPAL: si ya existe un pago "activo" (no pending/overdue),
      //    NUNCA lo tocamos. Solo limpiamos pendientes duplicados. ──
      const ACTIVE_STATUSES = [PaymentStatus.SUBMITTED, PaymentStatus.APPROVED,
                               PaymentStatus.REJECTED, PaymentStatus.WAIVED];
      const activePayment = branchPayments.find(p => ACTIVE_STATUSES.includes(p.status));

      if (activePayment) {
        // Migrar branchId=null al id real de la sucursal si hace falta
        if (activePayment.branchId === null) {
          activePayment.branchId   = branch.id;
          activePayment.branchName = branch.name;
          await this.paymentRepo.save(activePayment);
        }
        // Eliminar cualquier pago pending/overdue duplicado para esta sucursal
        const pendingDups = branchPayments.filter(p =>
          p.id !== activePayment.id && [PaymentStatus.PENDING, PaymentStatus.OVERDUE].includes(p.status),
        );
        if (pendingDups.length > 0) {
          await this.paymentRepo.delete(pendingDups.map(p => p.id));
        }
        results.push(activePayment);
        continue;
      }

      // Solo quedan pending/overdue (o ninguno)
      const pendingPayments = branchPayments.filter(p =>
        [PaymentStatus.PENDING, PaymentStatus.OVERDUE].includes(p.status),
      );

      if (pendingPayments.length === 0) {
        // Crear pago nuevo para esta sucursal
        const payment = await this.paymentRepo.save(this.paymentRepo.create({
          tenantId:       tenant.id,
          branchId:       branch.id,
          branchName:     branch.name,
          period,
          baseAmount:     pricePerBranch,
          lateFeePercent: 0,
          lateFeeAmount:  0,
          totalAmount:    pricePerBranch,
          dueDate,
          status:         PaymentStatus.PENDING,
        }));
        results.push(payment);
      } else {
        // Consolidar pendientes: conservar el más reciente, eliminar duplicados
        const sorted = [...pendingPayments].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        const keeper = sorted[0];

        // Migrar branchId=null → id real si hace falta
        let needsSave = keeper.branchId === null;
        if (keeper.branchId === null) {
          keeper.branchId   = branch.id;
          keeper.branchName = branch.name;
        }
        // Actualizar monto si cambió el precio del plan (solo en pending)
        if (keeper.status === PaymentStatus.PENDING && Number(keeper.baseAmount) !== pricePerBranch) {
          keeper.baseAmount  = pricePerBranch;
          keeper.totalAmount = pricePerBranch;
          needsSave = true;
        }
        if (needsSave) await this.paymentRepo.save(keeper);

        // Eliminar duplicados pendientes extra
        const extras = sorted.slice(1);
        if (extras.length > 0) await this.paymentRepo.delete(extras.map(p => p.id));

        results.push(keeper);
      }
    }

    return results;
  }

  // Compatibilidad con código existente (cron job, etc.)
  async ensureCurrentPayment(tenant: Tenant): Promise<TenantPayment | null> {
    const payments = await this.ensureCurrentPayments(tenant);
    return payments[0] ?? null;
  }

  // ─── OWNER / ADMIN: ver su estado de facturación ───────────────────────────
  // branchId: null = owner (ve todo), string = admin de esa sucursal

  async getMyBilling(tenantId: string, userBranchId: string | null) {
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Negocio no encontrado');

    // Generar/recuperar pagos del mes actual
    await this.ensureCurrentPayments(tenant);

    // Si el usuario es admin de una sucursal concreta, filtrar solo sus pagos
    const historyWhere: any = { tenantId };
    if (userBranchId !== null) {
      historyWhere.branchId = userBranchId;
    }

    const history = await this.paymentRepo.find({
      where: historyWhere,
      order: { period: 'DESC', branchName: 'ASC' },
      take: 24,
    });

    // Pagos del mes actual
    const period = this.currentPeriod();
    const currentPayments = history.filter(p => p.period === period);

    // Meses vencidos sin pagar
    const now = new Date();
    const unpaidMonths = history.filter(p =>
      [PaymentStatus.PENDING, PaymentStatus.OVERDUE, PaymentStatus.REJECTED].includes(p.status) &&
      new Date(p.dueDate) < now &&
      p.period !== period
    );

    const instructions = await this.getPaymentInstructions();

    const activeBranches = await this.branchRepo.count({ where: { tenantId, isActive: true } });
    const planBase    = await this.planPrice(tenant.plan as TenantPlan);
    const maxBranches = tenant.maxBranches ?? 1;
    const discountPct = Number(tenant.billingDiscountPct ?? 0);

    // Pago consolidado virtual para el banner (suma de todos los pagos del período)
    const currentTotal = currentPayments.reduce((s, p) => s + Number(p.totalAmount), 0);
    const bannerPayment = currentPayments.length > 0
      ? { ...currentPayments[0], totalAmount: currentTotal, baseAmount: currentTotal }
      : null;

    return {
      tenant: {
        businessName:     tenant.businessName,
        plan:             tenant.plan,
        maxBranches,
        activeBranches,
        planBasePrice:    planBase,
        discountPct,
        isBillingBlocked: tenant.isBillingBlocked,
        billingNotes:     tenant.billingNotes,
      },
      currentPayments,
      currentPayment: bannerPayment,   // para el banner: suma total del período
      unpaidMonths,
      unpaidCount: unpaidMonths.length,
      history,
      instructions,
    };
  }

  // ─── OWNER / ADMIN: enviar comprobante ─────────────────────────────────────

  async submitPayment(tenantId: string, userBranchId: string | null, dto: {
    paymentId: string;
    bankName: string;
    referenceNumber: string;
    transferAmount: number;
    proofNotes?: string;
    proofUrl?: string;
  }) {
    const payment = await this.paymentRepo.findOne({ where: { id: dto.paymentId, tenantId } });
    if (payment && userBranchId !== null && payment.branchId !== null && payment.branchId !== userBranchId) {
      throw new BadRequestException('No tienes permiso para pagar esta sucursal');
    }
    if (!payment) throw new NotFoundException('Pago no encontrado');

    if (payment.status === PaymentStatus.APPROVED) {
      throw new BadRequestException('Este pago ya fue aprobado');
    }
    if (payment.status === PaymentStatus.SUBMITTED) {
      throw new BadRequestException('Ya enviaste el comprobante, espera la aprobación');
    }

    payment.status          = PaymentStatus.SUBMITTED;
    payment.submittedAt     = new Date();
    payment.bankName        = dto.bankName;
    payment.referenceNumber = dto.referenceNumber;
    payment.transferAmount  = dto.transferAmount;
    payment.proofNotes      = dto.proofNotes ?? null;
    payment.proofUrl        = dto.proofUrl ?? null;

    const saved = await this.paymentRepo.save(payment);

    // Notificar a Saul por email
    try {
      const adminEmail = await this.settingRepo.findOne({ where: { key: 'admin_email' } });
      const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
      if (adminEmail?.value && tenant) {
        await this.mailService.sendPaymentSubmitted(adminEmail.value, {
          businessName: tenant.businessName,
          period: payment.period,
          amount: payment.totalAmount,
          bankName: dto.bankName,
          referenceNumber: dto.referenceNumber,
        });
      }
    } catch (e) {
      this.logger.warn('No se pudo enviar email de notificación de pago', e);
    }

    return saved;
  }

  // ─── ADMIN: ver todos los pagos (con sucursal) ───────────────────────────────

  async getAllPayments(status?: string) {
    const where: any = {};
    if (status) where.status = status;

    const payments = await this.paymentRepo.find({
      where,
      order: { createdAt: 'DESC' },
    });

    // Enriquecer con nombre del negocio
    const tenantIds = [...new Set(payments.map(p => p.tenantId))];
    const tenants = await this.tenantRepo.findByIds(tenantIds);
    const tenantMap = Object.fromEntries(tenants.map(t => [t.id, t]));

    return payments.map(p => ({
      ...p,
      businessName: tenantMap[p.tenantId]?.businessName ?? '—',
      businessEmail: tenantMap[p.tenantId]?.email ?? null,
      plan: tenantMap[p.tenantId]?.plan ?? null,
      isBillingBlocked: tenantMap[p.tenantId]?.isBillingBlocked ?? false,
      // branchName ya viene de la entidad; para pagos legacy = null → 'Principal'
      branchName: p.branchName ?? 'Principal',
    }));
  }

  // ─── ADMIN: aprobar pago ─────────────────────────────────────────────────────

  async approvePayment(paymentId: string, adminName: string) {
    const payment = await this.paymentRepo.findOne({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Pago no encontrado');
    if (payment.status === PaymentStatus.APPROVED) {
      throw new BadRequestException('Este pago ya fue aprobado');
    }

    payment.status     = PaymentStatus.APPROVED;
    payment.approvedAt = new Date();
    payment.approvedBy = adminName;
    await this.paymentRepo.save(payment);

    // Desbloquear el tenant si estaba bloqueado
    await this.tenantRepo.update(payment.tenantId, { isBillingBlocked: false });

    // Notificar al negocio
    try {
      const tenant = await this.tenantRepo.findOne({ where: { id: payment.tenantId } });
      if (tenant?.email) {
        await this.mailService.sendPaymentApproved(tenant.email, {
          businessName: tenant.businessName,
          period: payment.period,
          amount: payment.totalAmount,
        });
      }
    } catch (e) {
      this.logger.warn('No se pudo enviar email de aprobación', e);
    }

    // Crear notificación in-app para el tenant
    try {
      await this.notificationsService.create(
        payment.tenantId,
        'success',
        'Pago aprobado',
        `Tu pago del período ${payment.period} fue aprobado. El acceso completo está restaurado.`,
        '/dashboard/billing',
      );
    } catch { /* ignore */ }

    return { success: true, message: 'Pago aprobado y negocio desbloqueado' };
  }

  // ─── ADMIN: rechazar pago ────────────────────────────────────────────────────

  async rejectPayment(paymentId: string, reason: string, adminName: string) {
    const payment = await this.paymentRepo.findOne({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Pago no encontrado');

    payment.status         = PaymentStatus.REJECTED;
    payment.rejectedAt     = new Date();
    payment.rejectedReason = reason;
    payment.approvedBy     = adminName;
    await this.paymentRepo.save(payment);

    // Notificar al negocio
    try {
      const tenant = await this.tenantRepo.findOne({ where: { id: payment.tenantId } });
      if (tenant?.email) {
        await this.mailService.sendPaymentRejected(tenant.email, {
          businessName: tenant.businessName,
          period: payment.period,
          amount: payment.totalAmount,
          reason,
        });
      }
    } catch (e) {
      this.logger.warn('No se pudo enviar email de rechazo', e);
    }

    // Crear notificación in-app para el tenant
    try {
      await this.notificationsService.create(
        payment.tenantId,
        'error',
        'Pago rechazado',
        `Tu comprobante del período ${payment.period} fue rechazado. Motivo: ${reason}. Por favor sube un nuevo comprobante.`,
        '/dashboard/billing',
      );
    } catch { /* ignore */ }

    return { success: true, message: 'Pago rechazado' };
  }

  // ─── ADMIN: registrar pago manual ────────────────────────────────────────────

  async registerManualPayment(tenantId: string, dto: {
    period: string;
    amount: number;
    paymentMethod: string;
    referenceNumber?: string;
    notes?: string;
    adminName: string;
  }) {
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Negocio no encontrado');

    // Busca o crea el pago del período
    let payment = await this.paymentRepo.findOne({ where: { tenantId, period: dto.period } });
    if (!payment) {
      const dueDate = this.periodDueDate(dto.period);
      payment = this.paymentRepo.create({
        tenantId,
        period: dto.period,
        baseAmount: dto.amount,
        lateFeePercent: 0,
        lateFeeAmount: 0,
        totalAmount: dto.amount,
        dueDate,
        status: PaymentStatus.PENDING,
      });
    }

    payment.status          = PaymentStatus.APPROVED;
    payment.totalAmount     = dto.amount;
    payment.approvedAt      = new Date();
    payment.approvedBy      = dto.adminName;
    payment.adminNotes      = dto.notes ?? null;
    payment.referenceNumber = dto.referenceNumber ?? null;
    payment.bankName        = dto.paymentMethod;
    payment.submittedAt     = new Date();
    await this.paymentRepo.save(payment);

    // Desbloquear
    await this.tenantRepo.update(tenantId, { isBillingBlocked: false });

    return { success: true, message: 'Pago registrado manualmente' };
  }

  // ─── ADMIN: perdonar recargo ──────────────────────────────────────────────────

  async waivedPayment(paymentId: string, adminName: string) {
    const payment = await this.paymentRepo.findOne({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Pago no encontrado');

    payment.status       = PaymentStatus.WAIVED;
    payment.approvedBy   = adminName;
    payment.approvedAt   = new Date();
    payment.lateFeeAmount = 0;
    payment.lateFeePercent = 0;
    payment.totalAmount  = payment.baseAmount;
    await this.paymentRepo.save(payment);

    await this.tenantRepo.update(payment.tenantId, { isBillingBlocked: false });
    return { success: true, message: 'Pago perdonado/condonado' };
  }

  // ─── ADMIN: revertir pago a pendiente (corrección de error) ─────────────────

  async revertPayment(paymentId: string) {
    const payment = await this.paymentRepo.findOne({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Pago no encontrado');
    payment.status          = PaymentStatus.PENDING;
    payment.submittedAt     = null;
    payment.bankName        = null;
    payment.referenceNumber = null;
    payment.transferAmount  = null;
    payment.proofNotes      = null;
    payment.proofUrl        = null;
    payment.approvedAt      = null;
    payment.approvedBy      = null;
    payment.rejectedAt      = null;
    payment.rejectedReason  = null;
    await this.paymentRepo.save(payment);
    return { success: true, message: 'Pago revertido a pendiente' };
  }

  // ─── ADMIN: bloquear / desbloquear manual ────────────────────────────────────

  async setTenantBlocked(tenantId: string, blocked: boolean, notes?: string) {
    const update: any = { isBillingBlocked: blocked };
    if (notes !== undefined) update.billingNotes = notes;
    await this.tenantRepo.update(tenantId, update);
    return { success: true, isBillingBlocked: blocked };
  }

  // ─── ADMIN: actualizar notas de facturación ──────────────────────────────────

  async updateBillingNotes(tenantId: string, notes: string) {
    await this.tenantRepo.update(tenantId, { billingNotes: notes });
    return { success: true };
  }

  async updateBillingDiscount(tenantId: string, discountPct: number) {
    if (discountPct < 0 || discountPct > 100) throw new BadRequestException('El descuento debe estar entre 0 y 100');
    await this.tenantRepo.update(tenantId, { billingDiscountPct: discountPct });
    return { success: true, billingDiscountPct: discountPct };
  }

  // ─── ADMIN: resumen de facturación ──────────────────────────────────────────

  async getBillingOverview() {
    const tenants = await this.tenantRepo.find({ order: { businessName: 'ASC' } });
    const period = this.currentPeriod();

    const result: any[] = [];
    for (const t of tenants) {
      const activeBranches = await this.branchRepo.count({ where: { tenantId: t.id, isActive: true } });
      const price = await this.computeMonthlyTotal(t, activeBranches);
      if (price === 0) {
        result.push({
          tenantId: t.id, businessName: t.businessName, email: t.email,
          plan: t.plan, maxBranches: t.maxBranches ?? 1,
          billingDiscountPct: Number(t.billingDiscountPct ?? 0),
          isBillingBlocked: t.isBillingBlocked, billingNotes: t.billingNotes,
          currentPeriod: null, monthlyPrice: 0,
        });
        continue;
      }

      const payment = await this.paymentRepo.findOne({ where: { tenantId: t.id, period } });
      result.push({
        tenantId: t.id, businessName: t.businessName, email: t.email,
        plan: t.plan, maxBranches: t.maxBranches ?? 1,
        billingDiscountPct: Number(t.billingDiscountPct ?? 0),
        isBillingBlocked: t.isBillingBlocked, billingNotes: t.billingNotes,
        monthlyPrice: price, currentPeriod: payment ?? null,
      });
    }

    return result;
  }

  // ─── INSTRUCCIONES DE PAGO ────────────────────────────────────────────────────

  async getPaymentInstructions() {
    const keys = ['payment_bank_name', 'payment_account_number', 'payment_account_name',
                  'payment_account_type', 'payment_instructions', 'admin_email'];
    const rows = await this.settingRepo.find();
    const map = Object.fromEntries(rows.map(r => [r.key, r.value ?? '']));
    return {
      bankName:       map['payment_bank_name'] ?? '',
      accountNumber:  map['payment_account_number'] ?? '',
      accountName:    map['payment_account_name'] ?? '',
      accountType:    map['payment_account_type'] ?? '',
      instructions:   map['payment_instructions'] ?? 'Realiza la transferencia y sube el comprobante.',
    };
  }

  // ─── CRON: verificación diaria automática ────────────────────────────────────

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async runDailyBillingCheck() {
    this.logger.log('Ejecutando verificación diaria de facturación...');
    const now = new Date();
    const todayDay  = now.getDate();
    const tenants   = await this.tenantRepo.find();

    for (const tenant of tenants) {
      const activeBranches = await this.branchRepo.count({ where: { tenantId: tenant.id, isActive: true } });
      const price = await this.computeMonthlyTotal(tenant, activeBranches);
      if (price === 0) continue;

      // Asegurar que existe el pago del mes actual
      const payment = await this.ensureCurrentPayment(tenant);
      if (!payment) continue;

      // Si ya está aprobado/perdonado, skip
      if ([PaymentStatus.APPROVED, PaymentStatus.WAIVED].includes(payment.status)) continue;

      const dueDate  = new Date(payment.dueDate);
      // daysPastDue > 0 significa que ya pasó el día 5 del mes siguiente
      const daysPastDue = Math.floor((now.getTime() - dueDate.getTime()) / 86400000);

      // ── Día 28: enviar notificación "ya puedes pagar" ──────────────────────
      if (todayDay === PAYMENT_NOTIFY_DAY && payment.status === PaymentStatus.PENDING) {
        try {
          await this.notificationsService.create(
            tenant.id, 'warning',
            '⏰ Período de pago abierto',
            `Ya puedes realizar el pago de tu plan (${payment.period}). La fecha límite es el ${PAYMENT_DUE_DAY} del próximo mes. Total: RD$${Number(payment.totalAmount).toLocaleString('es-DO', { minimumFractionDigits: 2 })}.`,
            '/dashboard/billing',
          );
          if (tenant.email) {
            await this.mailService.sendPaymentReminder(tenant.email, {
              businessName: tenant.businessName,
              period: payment.period,
              amount: payment.totalAmount,
              dueDate: dueDate.toISOString(),
            }).catch(() => {});
          }
        } catch { /* ignore */ }
      }

      // ── Día siguiente al vencimiento (día 6+): aplicar recargo 10% ─────────
      if (daysPastDue > 0 && payment.lateFeePercent === 0 &&
          payment.status !== PaymentStatus.SUBMITTED) {
        payment.status         = PaymentStatus.OVERDUE;
        payment.lateFeePercent = LATE_FEE_PCT;
        payment.lateFeeAmount  = Math.round(payment.baseAmount * LATE_FEE_PCT / 100 * 100) / 100;
        payment.totalAmount    = payment.baseAmount + payment.lateFeeAmount;
        await this.paymentRepo.save(payment);
        this.logger.log(`Recargo 10% aplicado a ${tenant.businessName} (período ${payment.period})`);

        try {
          await this.notificationsService.create(
            tenant.id, 'error',
            '⚠️ Recargo por mora aplicado',
            `Tu pago del período ${payment.period} venció el día ${PAYMENT_DUE_DAY}. Se ha aplicado un recargo del ${LATE_FEE_PCT}%. Nuevo total: RD$${Number(payment.totalAmount).toLocaleString('es-DO', { minimumFractionDigits: 2 })}.`,
            '/dashboard/billing',
          );
        } catch { /* ignore */ }
      }

      // ── 3 meses sin pagar: auto-bloqueo ────────────────────────────────────
      const overdueMonths = await this.countOverdueMonths(tenant.id);
      if (overdueMonths >= BLOCK_AFTER_MONTHS && !tenant.isBillingBlocked &&
          payment.status !== PaymentStatus.SUBMITTED) {
        await this.tenantRepo.update(tenant.id, { isBillingBlocked: true });
        this.logger.log(`Negocio BLOQUEADO (${overdueMonths} meses sin pagar): ${tenant.businessName}`);

        try {
          await this.notificationsService.create(
            tenant.id, 'error',
            '🔒 Cuenta bloqueada por falta de pago',
            `Tu cuenta fue bloqueada por ${overdueMonths} meses sin pagar. Para restaurar el acceso, regulariza tus pagos y contacta a soporte.`,
            '/dashboard/billing',
          );
          if (tenant.email) {
            await this.mailService.sendBillingBlocked(tenant.email, {
              businessName: tenant.businessName,
              daysOverdue: overdueMonths * 30,
            }).catch(() => {});
          }
        } catch { /* ignore */ }
      }
    }

    this.logger.log('Verificación de facturación completada.');
  }

  // Ejecutar manualmente desde el admin (para no esperar el cron)
  async triggerManualCheck() {
    await this.runDailyBillingCheck();
    return { success: true, message: 'Verificación ejecutada correctamente' };
  }
}
