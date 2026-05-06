import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccountsPayable, ApStatus } from './entities/accounts-payable.entity';
import { ApPayment, ApPaymentMethod } from './entities/ap-payment.entity';
import { CreateApDto, RegisterApPaymentDto } from './dto/create-ap.dto';
import { AccountingService } from '../accounting/accounting.service';

@Injectable()
export class AccountsPayableService {
  constructor(
    @InjectRepository(AccountsPayable) private apRepo: Repository<AccountsPayable>,
    @InjectRepository(ApPayment) private paymentRepo: Repository<ApPayment>,
    private readonly accountingService: AccountingService,
  ) {}

  async create(tenantId: string, dto: CreateApDto, branchId?: string | null): Promise<AccountsPayable> {
    const ap = this.apRepo.create({
      tenantId, branchId: branchId ?? null,
      supplierId: dto.supplierId, supplierName: dto.supplierName,
      purchaseId: dto.purchaseId, ncfNumber: dto.ncfNumber,
      issueDate: new Date(dto.issueDate), dueDate: new Date(dto.dueDate),
      amount: dto.amount, balance: dto.amount, notes: dto.notes,
    });
    return this.apRepo.save(ap);
  }

  async registerPayment(id: string, tenantId: string, dto: RegisterApPaymentDto): Promise<AccountsPayable> {
    const ap = await this.apRepo.findOne({ where: { id, tenantId }, relations: ['payments'] });
    if (!ap) throw new NotFoundException('Cuenta por pagar no encontrada');
    if (ap.status === ApStatus.PAID) throw new BadRequestException('Esta cuenta ya está pagada');
    if (dto.amount > Number(ap.balance)) throw new BadRequestException(`El monto excede el saldo pendiente (${ap.balance})`);

    const payment = this.paymentRepo.create({
      apId: id, paymentDate: new Date(dto.paymentDate), amount: dto.amount,
      method: (dto.method as ApPaymentMethod) ?? ApPaymentMethod.CASH,
      reference: dto.reference, notes: dto.notes,
    });
    await this.paymentRepo.save(payment);

    const newPaid = Number(ap.paidAmount) + dto.amount;
    const newBalance = Number(ap.amount) - newPaid;
    ap.paidAmount = newPaid;
    ap.balance = newBalance;
    ap.status = newBalance <= 0 ? ApStatus.PAID : ApStatus.PARTIAL;
    const saved = await this.apRepo.save(ap);

    this.accountingService.autoPostApPaymentJournal(ap.tenantId, {
      apId: id,
      supplierName: ap.supplierName,
      amount: dto.amount,
      method: (dto as any).method ?? null,
      paymentDate: dto.paymentDate,
    }).catch(() => {});

    return saved;
  }

  async findAll(tenantId: string, branchId?: string | null): Promise<AccountsPayable[]> {
    // Auto-update overdue
    await this.apRepo.createQueryBuilder()
      .update(AccountsPayable)
      .set({ status: ApStatus.OVERDUE })
      .where('tenantId = :tenantId AND status IN (:...statuses) AND dueDate < :today', {
        tenantId, statuses: [ApStatus.PENDING, ApStatus.PARTIAL], today: new Date(),
      })
      .execute();
    const where: any = { tenantId };
    if (branchId) where.branchId = branchId;
    return this.apRepo.find({ where, relations: ['payments'], order: { dueDate: 'ASC' } });
  }

  async aging(tenantId: string, branchId?: string | null): Promise<object> {
    const all = await this.findAll(tenantId, branchId);
    const pending = all.filter(a => a.status !== ApStatus.PAID && a.status !== ApStatus.CANCELLED);
    const today = new Date();

    // Aging for payables: how much you owe and when it's due (days past due date)
    const buckets = { current: 0, days30: 0, days60: 0, days90: 0, over90: 0 };
    for (const ap of pending) {
      const days = Math.floor((today.getTime() - new Date(ap.dueDate).getTime()) / 86400000);
      const bal = Number(ap.balance);
      if (days <= 0) buckets.current += bal;
      else if (days <= 30) buckets.days30 += bal;
      else if (days <= 60) buckets.days60 += bal;
      else if (days <= 90) buckets.days90 += bal;
      else buckets.over90 += bal;
    }

    const total = Object.values(buckets).reduce((s, v) => s + v, 0);
    return { total, buckets, totalPending: pending.length };
  }

  async supplierStatement(tenantId: string, supplierId: string): Promise<object> {
    const records = await this.apRepo.find({
      where: { tenantId, supplierId }, relations: ['payments'], order: { issueDate: 'ASC' },
    });
    const totalAmount = records.reduce((s, r) => s + Number(r.amount), 0);
    const totalPaid = records.reduce((s, r) => s + Number(r.paidAmount), 0);
    return { supplierId, records, totalAmount, totalPaid, balance: totalAmount - totalPaid };
  }
}
