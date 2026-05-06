import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AccountsReceivable, ArStatus } from './entities/accounts-receivable.entity';
import { ArPayment, PaymentMethod } from './entities/ar-payment.entity';
import { Customer } from '../customers/entities/customer.entity';
import { CreateArDto, RegisterArPaymentDto } from './dto/create-ar.dto';
import { MailService } from '../mail/mail.service';
import { AccountingService } from '../accounting/accounting.service';

@Injectable()
export class AccountsReceivableService {
  private readonly logger = new Logger(AccountsReceivableService.name);

  constructor(
    @InjectRepository(AccountsReceivable) private arRepo: Repository<AccountsReceivable>,
    @InjectRepository(ArPayment) private paymentRepo: Repository<ArPayment>,
    @InjectRepository(Customer) private customerRepo: Repository<Customer>,
    private readonly mailService: MailService,
    private readonly accountingService: AccountingService,
  ) {}

  async create(tenantId: string, dto: CreateArDto, branchId?: string | null): Promise<AccountsReceivable> {
    const ar = this.arRepo.create({
      tenantId, branchId: branchId ?? null,
      customerId: dto.customerId, customerName: dto.customerName,
      saleId: dto.saleId, ncfNumber: dto.ncfNumber,
      issueDate: new Date(dto.issueDate), dueDate: new Date(dto.dueDate),
      amount: dto.amount, balance: dto.amount, notes: dto.notes,
    });
    return this.arRepo.save(ar);
  }

  async registerPayment(id: string, tenantId: string, dto: RegisterArPaymentDto): Promise<AccountsReceivable> {
    const ar = await this.arRepo.findOne({ where: { id, tenantId }, relations: ['payments'] });
    if (!ar) throw new NotFoundException('Cuenta por cobrar no encontrada');
    if (ar.status === ArStatus.PAID) throw new BadRequestException('Esta cuenta ya está pagada');
    if (dto.amount > Number(ar.balance)) throw new BadRequestException(`El monto excede el saldo pendiente (${ar.balance})`);

    const payment = this.paymentRepo.create({
      arId: id, paymentDate: new Date(dto.paymentDate), amount: dto.amount,
      method: (dto.method as PaymentMethod) ?? PaymentMethod.CASH,
      reference: dto.reference, notes: dto.notes,
    });
    await this.paymentRepo.save(payment);

    const newPaid = Number(ar.paidAmount) + dto.amount;
    const newBalance = Number(ar.amount) - newPaid;
    ar.paidAmount = newPaid;
    ar.balance = newBalance;
    ar.status = newBalance <= 0 ? ArStatus.PAID : ArStatus.PARTIAL;
    const saved = await this.arRepo.save(ar);

    this.accountingService.autoPostArPaymentJournal(ar.tenantId, {
      arId: id,
      customerName: ar.customerName,
      amount: dto.amount,
      method: (dto as any).method ?? null,
      paymentDate: dto.paymentDate,
    }).catch(() => {});

    return saved;
  }

  async findAll(tenantId: string, branchId?: string | null): Promise<AccountsReceivable[]> {
    // Auto-update overdue
    await this.arRepo.createQueryBuilder()
      .update(AccountsReceivable)
      .set({ status: ArStatus.OVERDUE })
      .where('tenantId = :tenantId AND status IN (:...statuses) AND dueDate < :today', {
        tenantId, statuses: [ArStatus.PENDING, ArStatus.PARTIAL], today: new Date(),
      })
      .execute();
    const where: any = { tenantId };
    if (branchId) where.branchId = branchId;
    return this.arRepo.find({ where, relations: ['payments'], order: { dueDate: 'ASC' } });
  }

  async aging(tenantId: string, branchId?: string | null): Promise<object> {
    const all = await this.findAll(tenantId, branchId);
    const pending = all.filter(a => a.status !== ArStatus.PAID && a.status !== ArStatus.CANCELLED);
    const today = new Date();

    const buckets = { current: 0, days30: 0, days60: 0, days90: 0, over90: 0 };
    for (const ar of pending) {
      const days = Math.floor((today.getTime() - new Date(ar.dueDate).getTime()) / 86400000);
      const bal = Number(ar.balance);
      if (days <= 0) buckets.current += bal;
      else if (days <= 30) buckets.days30 += bal;
      else if (days <= 60) buckets.days60 += bal;
      else if (days <= 90) buckets.days90 += bal;
      else buckets.over90 += bal;
    }

    const total = Object.values(buckets).reduce((s, v) => s + v, 0);
    return { total, buckets, totalPending: pending.length };
  }

  async customerStatement(tenantId: string, customerId: string): Promise<object> {
    const records = await this.arRepo.find({
      where: { tenantId, customerId }, relations: ['payments'], order: { issueDate: 'ASC' },
    });
    const totalAmount = records.reduce((s, r) => s + Number(r.amount), 0);
    const totalPaid = records.reduce((s, r) => s + Number(r.paidAmount), 0);
    return { customerId, records, totalAmount, totalPaid, balance: totalAmount - totalPaid };
  }

  // ─── Cron: recordatorio de CxC vencidas (cada día a las 8am) ─────────────────
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async sendOverdueReminders(): Promise<void> {
    const today = new Date();
    // Busca CxC vencidas con saldo pendiente (cualquier tenant)
    const overdue = await this.arRepo.find({
      where: {
        status: ArStatus.OVERDUE,
        dueDate: LessThan(today),
      },
    });
    for (const ar of overdue) {
      try {
        if (!ar.customerId) continue;
        const customer = await this.customerRepo.findOne({ where: { id: ar.customerId, tenantId: ar.tenantId } });
        if (!customer?.email) continue;

        const fmt = (n: number) => `RD$ ${Number(n).toLocaleString('es-DO', { minimumFractionDigits: 2 })}`;
        const daysOverdue = Math.floor((today.getTime() - new Date(ar.dueDate).getTime()) / 86400000);

        await this.mailService.sendRaw(
          customer.email,
          `Recordatorio de pago pendiente — ${ar.ncfNumber ?? ar.id.slice(-8)}`,
          `
<div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;padding:32px;">
  <h2 style="color:#dc2626;">Recordatorio de Pago</h2>
  <p>Estimado(a) <strong>${ar.customerName}</strong>,</p>
  <p>Le informamos que tiene una cuenta por cobrar vencida con los siguientes detalles:</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0;">
    <tr><td style="padding:8px;border-bottom:1px solid #e2e8f0;color:#64748b;">Factura / NCF</td><td style="padding:8px;border-bottom:1px solid #e2e8f0;font-weight:600;">${ar.ncfNumber ?? '—'}</td></tr>
    <tr><td style="padding:8px;border-bottom:1px solid #e2e8f0;color:#64748b;">Saldo pendiente</td><td style="padding:8px;border-bottom:1px solid #e2e8f0;font-weight:700;color:#dc2626;">${fmt(Number(ar.balance))}</td></tr>
    <tr><td style="padding:8px;color:#64748b;">Días vencido</td><td style="padding:8px;color:#dc2626;font-weight:600;">${daysOverdue} día${daysOverdue !== 1 ? 's' : ''}</td></tr>
  </table>
  <p>Por favor, realice su pago a la brevedad posible para evitar recargos adicionales.</p>
  <p style="font-size:12px;color:#94a3b8;margin-top:24px;">FiscalRD — SM SOFTWARE SOLUTIONS</p>
</div>`,
        );
        this.logger.log(`Recordatorio CxC enviado a ${customer.email} (${ar.ncfNumber})`);
      } catch (e: any) {
        this.logger.error(`Error enviando recordatorio CxC: ${e?.message}`);
      }
    }
  }
}
