import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CashTransaction, TransactionType } from './entities/cash-transaction.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';

@Injectable()
export class CashBankService {
  constructor(@InjectRepository(CashTransaction) private repo: Repository<CashTransaction>) {}

  async create(tenantId: string, dto: CreateTransactionDto, branchId?: string | null): Promise<CashTransaction> {
    const t = this.repo.create({ tenantId, branchId: branchId ?? null, ...dto, transactionDate: new Date(dto.transactionDate) });
    return this.repo.save(t);
  }

  async findAll(tenantId: string, branchId?: string | null): Promise<CashTransaction[]> {
    const where: any = { tenantId };
    if (branchId) where.branchId = branchId;
    return this.repo.find({ where, order: { transactionDate: 'DESC' } });
  }

  async balance(tenantId: string, branchId?: string | null): Promise<object> {
    const where: any = { tenantId };
    if (branchId) where.branchId = branchId;
    const all = await this.repo.find({ where });
    const income = all.filter(t => t.type === TransactionType.INCOME).reduce((s, t) => s + Number(t.amount), 0);
    const expenses = all.filter(t => t.type === TransactionType.EXPENSE).reduce((s, t) => s + Number(t.amount), 0);
    const byMethod: Record<string, { income: number; expenses: number; balance: number }> = {};
    for (const t of all) {
      if (!byMethod[t.method]) byMethod[t.method] = { income: 0, expenses: 0, balance: 0 };
      if (t.type === TransactionType.INCOME) byMethod[t.method].income += Number(t.amount);
      else byMethod[t.method].expenses += Number(t.amount);
      byMethod[t.method].balance = byMethod[t.method].income - byMethod[t.method].expenses;
    }

    // Cuando el owner ve todas las sucursales, añadir desglose por sucursal
    let byBranch: Record<string, { branchId: string | null; income: number; expenses: number; balance: number }> | null = null;
    if (!branchId) {
      byBranch = {};
      for (const t of all) {
        const key = t.branchId ?? '__general__';
        if (!byBranch[key]) byBranch[key] = { branchId: t.branchId, income: 0, expenses: 0, balance: 0 };
        if (t.type === TransactionType.INCOME) byBranch[key].income += Number(t.amount);
        else byBranch[key].expenses += Number(t.amount);
        byBranch[key].balance = byBranch[key].income - byBranch[key].expenses;
      }
    }

    return { totalIncome: income, totalExpenses: expenses, balance: income - expenses, byMethod, byBranch };
  }

  async dailySummary(tenantId: string, date: string, branchId?: string | null): Promise<object> {
    const d = new Date(date + 'T12:00:00'); // mediodía para evitar timezone shift
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
    const end   = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);

    const qb = this.repo.createQueryBuilder('t')
      .where('t.tenantId = :tenantId', { tenantId })
      .andWhere('t.transactionDate >= :start', { start })
      .andWhere('t.transactionDate <= :end', { end })
      .orderBy('t.transactionDate', 'ASC');
    if (branchId) qb.andWhere('t.branchId = :branchId', { branchId });
    const transactions = await qb.getMany();

    const income   = transactions.filter(t => t.type === TransactionType.INCOME).reduce((s, t) => s + Number(t.amount), 0);
    const expenses = transactions.filter(t => t.type === TransactionType.EXPENSE).reduce((s, t) => s + Number(t.amount), 0);
    return { date, transactions, income, expenses, net: income - expenses };
  }

  // ─── CONCILIACIÓN BANCARIA ─────────────────────────────────────────────────

  async getReconciliationSummary(tenantId: string) {
    const all = await this.repo.find({ where: { tenantId }, order: { transactionDate: 'DESC' } });

    const reconciled   = all.filter(t => t.reconciled);
    const unreconciled = all.filter(t => !t.reconciled);

    const reconciledBalance   = reconciled.reduce((s, t) =>
      t.type === TransactionType.INCOME ? s + Number(t.amount) : s - Number(t.amount), 0);
    const unreconciledBalance = unreconciled.reduce((s, t) =>
      t.type === TransactionType.INCOME ? s + Number(t.amount) : s - Number(t.amount), 0);

    return {
      totalTransactions:      all.length,
      reconciledCount:        reconciled.length,
      unreconciledCount:      unreconciled.length,
      reconciledBalance,
      unreconciledBalance,
      systemBalance:          reconciledBalance + unreconciledBalance,
      unreconciledTransactions: unreconciled,
    };
  }

  async reconcileTransactions(tenantId: string, dto: {
    transactionIds: string[];
    statementBalance: number;
    statementRef?: string;
  }) {
    const transactions = await this.repo
      .createQueryBuilder('t')
      .where('t.tenantId = :tenantId', { tenantId })
      .andWhere('t.id IN (:...ids)', { ids: dto.transactionIds })
      .getMany();

    if (transactions.length === 0) throw new NotFoundException('No se encontraron transacciones');

    const now = new Date();
    for (const t of transactions) {
      t.reconciled      = true;
      t.reconciledAt    = now;
      t.bankStatementRef = dto.statementRef ?? null;
    }
    await this.repo.save(transactions);

    // Calcular diferencia entre saldo del sistema y saldo del estado de cuenta
    const systemBalance = transactions.reduce((s, t) =>
      t.type === TransactionType.INCOME ? s + Number(t.amount) : s - Number(t.amount), 0);
    const difference = dto.statementBalance - systemBalance;

    return {
      success: true,
      reconciledCount: transactions.length,
      systemBalance,
      statementBalance: dto.statementBalance,
      difference,
      message: difference === 0
        ? 'Conciliación perfecta — los saldos coinciden'
        : `Diferencia de RD$${Math.abs(difference).toFixed(2)} ${difference > 0 ? '(estado de cuenta mayor)' : '(sistema mayor)'}`,
    };
  }

  async unreconcileTransaction(tenantId: string, id: string) {
    const t = await this.repo.findOne({ where: { id, tenantId } });
    if (!t) throw new NotFoundException('Transacción no encontrada');
    t.reconciled      = false;
    t.reconciledAt    = null;
    t.bankStatementRef = null;
    await this.repo.save(t);
    return { success: true };
  }
}
