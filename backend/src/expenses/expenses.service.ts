import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Expense } from './entities/expense.entity';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { AccountingService } from '../accounting/accounting.service';

@Injectable()
export class ExpensesService {
  constructor(
    @InjectRepository(Expense) private expenseRepo: Repository<Expense>,
    private readonly accountingService: AccountingService,
  ) {}

  async create(tenantId: string, userBranchId: string | null, dto: CreateExpenseDto): Promise<Expense> {
    const branchId = userBranchId !== null ? userBranchId : ((dto as any).branchId ?? null);
    const expense = this.expenseRepo.create({
      tenantId,
      branchId,
      category: dto.category,
      description: dto.description,
      amount: dto.amount,
      expenseDate: new Date(dto.expenseDate),
      supplierName: dto.supplierName,
      supplierRnc: dto.supplierRnc,
      ncfNumber: dto.ncfNumber,
      reference: dto.reference,
      notes: dto.notes,
      hasItbis: dto.hasItbis ?? false,
      itbisAmount: dto.itbisAmount ?? 0,
      paymentMethod: dto.paymentMethod,
    });
    const saved = await this.expenseRepo.save(expense);

    this.accountingService.autoPostExpenseJournal(tenantId, {
      expenseId: saved.id,
      category: saved.category,
      description: saved.description,
      amount: Number(saved.amount),
      paymentMethod: saved.paymentMethod ?? null,
      expenseDate: saved.expenseDate,
    }).catch(() => {});

    return saved;
  }

  async findAll(tenantId: string, branchId: string | null, filters?: { from?: string; to?: string; category?: string }): Promise<Expense[]> {
    const qb = this.expenseRepo.createQueryBuilder('e')
      .where('e.tenantId = :tenantId', { tenantId })
      .andWhere('e.deletedAt IS NULL')
      .orderBy('e.expenseDate', 'DESC');

    if (branchId !== null) {
      qb.andWhere('e.branchId = :branchId', { branchId });
    }

    if (filters?.from) {
      qb.andWhere('e.expenseDate >= :from', { from: filters.from });
    }
    if (filters?.to) {
      qb.andWhere('e.expenseDate <= :to', { to: filters.to });
    }
    if (filters?.category) {
      qb.andWhere('e.category = :category', { category: filters.category });
    }

    return qb.getMany();
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const expense = await this.expenseRepo.findOne({ where: { id, tenantId } });
    if (!expense) throw new NotFoundException('Gasto no encontrado');
    await this.expenseRepo.softDelete(id);
  }

  async monthlySummary(tenantId: string, year: number, month: number) {
    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const end = new Date(year, month, 0).toISOString().split('T')[0]; // last day of month

    const expenses = await this.expenseRepo.createQueryBuilder('e')
      .where('e.tenantId = :tenantId', { tenantId })
      .andWhere('e.deletedAt IS NULL')
      .andWhere('e.expenseDate >= :start', { start })
      .andWhere('e.expenseDate <= :end', { end })
      .getMany();

    const byCategory: Record<string, { category: string; total: number; itbisTotal: number; count: number }> = {};

    for (const e of expenses) {
      if (!byCategory[e.category]) {
        byCategory[e.category] = { category: e.category, total: 0, itbisTotal: 0, count: 0 };
      }
      byCategory[e.category].total += Number(e.amount);
      byCategory[e.category].itbisTotal += Number(e.itbisAmount);
      byCategory[e.category].count += 1;
    }

    const categories = Object.values(byCategory).sort((a, b) => b.total - a.total);
    const grandTotal = categories.reduce((s, c) => s + c.total, 0);
    const itbisTotal = categories.reduce((s, c) => s + c.itbisTotal, 0);

    return {
      period: `${year}-${String(month).padStart(2, '0')}`,
      totalRecords: expenses.length,
      grandTotal,
      itbisTotal,
      categories,
    };
  }
}
