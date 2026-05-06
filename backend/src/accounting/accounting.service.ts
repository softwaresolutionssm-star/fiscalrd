import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { todayDR } from '../common/utils/date.utils';
import { Account, AccountType } from './entities/account.entity';
import { JournalEntry, JournalEntryStatus } from './entities/journal-entry.entity';
import { JournalLine } from './entities/journal-line.entity';
import { CreateAccountDto } from './dto/create-account.dto';
import { CreateJournalEntryDto } from './dto/create-journal-entry.dto';

@Injectable()
export class AccountingService {
  constructor(
    @InjectRepository(Account) private accountRepo: Repository<Account>,
    @InjectRepository(JournalEntry) private journalRepo: Repository<JournalEntry>,
    @InjectRepository(JournalLine) private lineRepo: Repository<JournalLine>,
  ) {}

  async seedDefaultAccounts(tenantId: string): Promise<{ message: string }> {
    const existing = await this.accountRepo.count({ where: { tenantId } });
    if (existing > 0) return { message: 'Las cuentas ya existen' };

    const accounts = [
      { code: '1', name: 'ACTIVOS', type: AccountType.ASSET },
      { code: '1.1', name: 'Activo Corriente', type: AccountType.ASSET },
      { code: '1.1.01', name: 'Caja General', type: AccountType.ASSET },
      { code: '1.1.02', name: 'Banco', type: AccountType.ASSET },
      { code: '1.1.03', name: 'Cuentas por Cobrar', type: AccountType.ASSET },
      { code: '1.1.04', name: 'ITBIS por Cobrar', type: AccountType.ASSET },
      { code: '1.1.05', name: 'Inventario', type: AccountType.ASSET },
      { code: '1.2', name: 'Activo No Corriente', type: AccountType.ASSET },
      { code: '1.2.01', name: 'Propiedad, Planta y Equipo', type: AccountType.ASSET },
      { code: '2', name: 'PASIVOS', type: AccountType.LIABILITY },
      { code: '2.1', name: 'Pasivo Corriente', type: AccountType.LIABILITY },
      { code: '2.1.01', name: 'Cuentas por Pagar', type: AccountType.LIABILITY },
      { code: '2.1.02', name: 'ITBIS por Pagar', type: AccountType.LIABILITY },
      { code: '2.1.03', name: 'ISR por Pagar', type: AccountType.LIABILITY },
      { code: '2.1.04', name: 'SFS por Pagar', type: AccountType.LIABILITY },
      { code: '2.1.05', name: 'AFP por Pagar', type: AccountType.LIABILITY },
      { code: '2.1.06', name: 'Salarios por Pagar', type: AccountType.LIABILITY },
      { code: '3', name: 'PATRIMONIO', type: AccountType.EQUITY },
      { code: '3.1', name: 'Capital Social', type: AccountType.EQUITY },
      { code: '3.2', name: 'Utilidades Retenidas', type: AccountType.EQUITY },
      { code: '4', name: 'INGRESOS', type: AccountType.INCOME },
      { code: '4.1', name: 'Ventas', type: AccountType.INCOME },
      { code: '4.1.01', name: 'Ingresos por Ventas', type: AccountType.INCOME },
      { code: '4.1.02', name: 'Descuentos en Ventas', type: AccountType.INCOME },
      { code: '5', name: 'GASTOS', type: AccountType.EXPENSE },
      { code: '5.1', name: 'Gastos Operativos', type: AccountType.EXPENSE },
      { code: '5.1.01', name: 'Costo de Ventas', type: AccountType.EXPENSE },
      { code: '5.1.02', name: 'Sueldos y Salarios', type: AccountType.EXPENSE },
      { code: '5.1.03', name: 'SFS Patronal', type: AccountType.EXPENSE },
      { code: '5.1.04', name: 'AFP Patronal', type: AccountType.EXPENSE },
      { code: '5.1.05', name: 'Regalía Pascual', type: AccountType.EXPENSE },
      { code: '5.1.06', name: 'Alquiler', type: AccountType.EXPENSE },
      { code: '5.1.07', name: 'Electricidad', type: AccountType.EXPENSE },
      { code: '5.1.08', name: 'Comunicaciones', type: AccountType.EXPENSE },
      { code: '5.2', name: 'Gastos Financieros', type: AccountType.EXPENSE },
      { code: '5.2.01', name: 'Intereses Bancarios', type: AccountType.EXPENSE },
    ];

    for (const a of accounts) {
      await this.accountRepo.save(this.accountRepo.create({ ...a, tenantId, isSystem: true }));
    }
    return { message: `${accounts.length} cuentas creadas exitosamente` };
  }

  async findAllAccounts(tenantId: string): Promise<Account[]> {
    return this.accountRepo.find({ where: { tenantId }, order: { code: 'ASC' } });
  }

  async createAccount(tenantId: string, dto: CreateAccountDto): Promise<Account> {
    const account = this.accountRepo.create({ ...dto, tenantId });
    return this.accountRepo.save(account);
  }

  async setOpeningBalance(tenantId: string, accountId: string, balance: number): Promise<Account> {
    const account = await this.accountRepo.findOne({ where: { id: accountId, tenantId } });
    if (!account) throw new NotFoundException('Cuenta no encontrada');
    account.balance = balance;
    return this.accountRepo.save(account);
  }

  async createJournalEntry(tenantId: string, dto: CreateJournalEntryDto): Promise<JournalEntry> {
    const totalDebit = dto.lines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = dto.lines.reduce((s, l) => s + l.credit, 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new BadRequestException(
        `Asiento no balanceado. Débito: ${totalDebit}, Crédito: ${totalCredit}`,
      );
    }

    const entry = this.journalRepo.create({
      tenantId,
      date: new Date(dto.date),
      description: dto.description,
      reference: dto.reference,
      totalDebit,
      totalCredit,
      lines: dto.lines.map((l) => this.lineRepo.create(l)),
    });

    return this.journalRepo.save(entry);
  }

  async postJournalEntry(id: string, tenantId: string): Promise<JournalEntry> {
    const entry = await this.journalRepo.findOne({
      where: { id, tenantId },
      relations: ['lines', 'lines.account'],
    });
    if (!entry) throw new NotFoundException('Asiento no encontrado');
    if (entry.status === JournalEntryStatus.POSTED)
      throw new BadRequestException('El asiento ya está contabilizado');

    for (const line of entry.lines) {
      const account = await this.accountRepo.findOne({ where: { id: line.accountId } });
      if (!account) continue;
      const isDebitNormal = [AccountType.ASSET, AccountType.EXPENSE].includes(account.type);
      const balanceChange = isDebitNormal ? line.debit - line.credit : line.credit - line.debit;
      await this.accountRepo.update(account.id, { balance: Number(account.balance) + balanceChange });
    }

    entry.status = JournalEntryStatus.POSTED;
    return this.journalRepo.save(entry);
  }

  async findAllJournalEntries(tenantId: string): Promise<JournalEntry[]> {
    return this.journalRepo.find({
      where: { tenantId },
      relations: ['lines', 'lines.account'],
      order: { date: 'DESC' },
    });
  }

  async balanceSheet(tenantId: string): Promise<object> {
    const accounts = await this.accountRepo.find({ where: { tenantId } });
    const group = (type: AccountType) =>
      accounts
        .filter((a) => a.type === type && a.code.split('.').length === 3)
        .map((a) => ({ code: a.code, name: a.name, balance: Number(a.balance) }));

    const assets = group(AccountType.ASSET);
    const liabilities = group(AccountType.LIABILITY);
    const equity = group(AccountType.EQUITY);

    return {
      date: todayDR(),
      assets: { items: assets, total: assets.reduce((s, a) => s + a.balance, 0) },
      liabilities: { items: liabilities, total: liabilities.reduce((s, a) => s + a.balance, 0) },
      equity: { items: equity, total: equity.reduce((s, a) => s + a.balance, 0) },
    };
  }

  // ─── Auto-journal helpers (non-blocking, silent on error) ────────────────────

  private async getAccountByCode(tenantId: string, code: string): Promise<Account | null> {
    return this.accountRepo.findOne({ where: { tenantId, code } });
  }

  async autoPostSaleJournal(tenantId: string, params: {
    id: string;
    ncfNumber?: string | null;
    customerName?: string | null;
    subtotal: number;
    itbisTotal: number;
    total: number;
    paymentMethod?: string | null;
    saleDate: Date | string;
    cogsCost?: number;
  }): Promise<void> {
    try {
      const debitCode = params.paymentMethod === 'credit' ? '1.1.03'
        : params.paymentMethod === 'transfer' ? '1.1.02'
        : '1.1.01';

      const [debitAcc, incomeAcc, itbisAcc, cogsAcc, inventoryAcc] = await Promise.all([
        this.getAccountByCode(tenantId, debitCode),
        this.getAccountByCode(tenantId, '4.1.01'),
        this.getAccountByCode(tenantId, '2.1.02'),
        params.cogsCost ? this.getAccountByCode(tenantId, '5.1.01') : Promise.resolve(null),
        params.cogsCost ? this.getAccountByCode(tenantId, '1.1.05') : Promise.resolve(null),
      ]);

      if (!debitAcc || !incomeAcc) return; // Accounts not seeded yet

      const sub = Number(params.subtotal);
      const itb = Number(params.itbisTotal);
      const tot = Number(params.total);

      const lines: { accountId: string; debit: number; credit: number }[] = [
        { accountId: debitAcc.id, debit: tot, credit: 0 },
        { accountId: incomeAcc.id, debit: 0, credit: sub },
      ];
      if (itb > 0 && itbisAcc) {
        lines.push({ accountId: itbisAcc.id, debit: 0, credit: itb });
      }
      if (params.cogsCost && params.cogsCost > 0 && cogsAcc && inventoryAcc) {
        lines.push({ accountId: cogsAcc.id, debit: params.cogsCost, credit: 0 });
        lines.push({ accountId: inventoryAcc.id, debit: 0, credit: params.cogsCost });
      }

      const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
      const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
      if (Math.abs(totalDebit - totalCredit) > 0.02) return; // unbalanced, skip

      const dateStr = params.saleDate instanceof Date
        ? params.saleDate.toISOString().split('T')[0]
        : String(params.saleDate).split('T')[0];

      const entry = await this.createJournalEntry(tenantId, {
        date: dateStr,
        description: `Venta ${params.ncfNumber ?? params.id}${params.customerName ? ' — ' + params.customerName : ''}`,
        reference: params.ncfNumber ?? undefined,
        lines,
      });
      await this.postJournalEntry(entry.id, tenantId);
    } catch { /* intentionally silent */ }
  }

  async autoPostPurchaseJournal(tenantId: string, params: {
    id: string;
    supplierName?: string | null;
    ncfNumber?: string | null;
    subtotal: number;
    itbisTotal: number;
    total: number;
    isCredit: boolean;
    purchaseDate: Date | string;
  }): Promise<void> {
    try {
      const creditCode = params.isCredit ? '2.1.01' : '1.1.01';

      const [inventoryAcc, itbisCobrarAcc, creditAcc] = await Promise.all([
        this.getAccountByCode(tenantId, '1.1.05'),
        this.getAccountByCode(tenantId, '1.1.04'),
        this.getAccountByCode(tenantId, creditCode),
      ]);

      if (!inventoryAcc || !creditAcc) return;

      const sub = Number(params.subtotal);
      const itb = Number(params.itbisTotal);
      const tot = Number(params.total);

      const lines: { accountId: string; debit: number; credit: number }[] = [
        { accountId: inventoryAcc.id, debit: sub, credit: 0 },
      ];
      if (itb > 0 && itbisCobrarAcc) {
        lines.push({ accountId: itbisCobrarAcc.id, debit: itb, credit: 0 });
      }
      lines.push({ accountId: creditAcc.id, debit: 0, credit: tot });

      const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
      const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
      if (Math.abs(totalDebit - totalCredit) > 0.02) return;

      const dateStr = params.purchaseDate instanceof Date
        ? params.purchaseDate.toISOString().split('T')[0]
        : String(params.purchaseDate).split('T')[0];

      const entry = await this.createJournalEntry(tenantId, {
        date: dateStr,
        description: `Compra ${params.supplierName ?? ''}${params.ncfNumber ? ' — ' + params.ncfNumber : ''}`,
        reference: params.ncfNumber ?? undefined,
        lines,
      });
      await this.postJournalEntry(entry.id, tenantId);
    } catch { /* intentionally silent */ }
  }

  async incomeStatement(tenantId: string, year: number, month?: number): Promise<object> {
    const startDate = month ? new Date(year, month - 1, 1) : new Date(year, 0, 1);
    const endDate = month ? new Date(year, month, 0, 23, 59, 59) : new Date(year, 11, 31, 23, 59, 59);

    const entries = await this.journalRepo.find({
      where: { tenantId, status: JournalEntryStatus.POSTED, date: Between(startDate, endDate) as any },
      relations: ['lines', 'lines.account'],
    });

    const balances = new Map<string, { code: string; name: string; type: AccountType; balance: number }>();
    for (const entry of entries) {
      for (const line of entry.lines) {
        if (!line.account) continue;
        const acct = line.account;
        if (acct.code.split('.').length !== 3) continue;
        if (acct.type !== AccountType.INCOME && acct.type !== AccountType.EXPENSE) continue;
        const existing = balances.get(acct.id) ?? { code: acct.code, name: acct.name, type: acct.type, balance: 0 };
        const isDebitNormal = acct.type === AccountType.EXPENSE;
        existing.balance += isDebitNormal ? (Number(line.debit) - Number(line.credit)) : (Number(line.credit) - Number(line.debit));
        balances.set(acct.id, existing);
      }
    }

    const income = Array.from(balances.values())
      .filter(a => a.type === AccountType.INCOME)
      .map(a => ({ code: a.code, name: a.name, balance: a.balance }))
      .sort((a, b) => a.code.localeCompare(b.code));
    const expenses = Array.from(balances.values())
      .filter(a => a.type === AccountType.EXPENSE)
      .map(a => ({ code: a.code, name: a.name, balance: a.balance }))
      .sort((a, b) => a.code.localeCompare(b.code));

    const totalIncome = income.reduce((s, a) => s + a.balance, 0);
    const totalExpenses = expenses.reduce((s, a) => s + a.balance, 0);

    return {
      period: month ? `${year}-${String(month).padStart(2, '0')}` : `${year}`,
      income: { items: income, total: totalIncome },
      expenses: { items: expenses, total: totalExpenses },
      netIncome: totalIncome - totalExpenses,
    };
  }

  async autoPostArPaymentJournal(tenantId: string, params: {
    arId: string;
    customerName?: string | null;
    amount: number;
    method?: string | null;
    paymentDate: Date | string;
  }): Promise<void> {
    try {
      const debitCode = params.method === 'transfer' ? '1.1.02' : '1.1.01';
      const [debitAcc, cxcAcc] = await Promise.all([
        this.getAccountByCode(tenantId, debitCode),
        this.getAccountByCode(tenantId, '1.1.03'),
      ]);
      if (!debitAcc || !cxcAcc) return;
      const amt = Number(params.amount);
      const dateStr = params.paymentDate instanceof Date
        ? params.paymentDate.toISOString().split('T')[0]
        : String(params.paymentDate).split('T')[0];
      const entry = await this.createJournalEntry(tenantId, {
        date: dateStr,
        description: `Cobro CxC${params.customerName ? ' — ' + params.customerName : ''}`,
        reference: params.arId,
        lines: [
          { accountId: debitAcc.id, debit: amt, credit: 0 },
          { accountId: cxcAcc.id, debit: 0, credit: amt },
        ],
      });
      await this.postJournalEntry(entry.id, tenantId);
    } catch { /* intentionally silent */ }
  }

  async autoPostApPaymentJournal(tenantId: string, params: {
    apId: string;
    supplierName?: string | null;
    amount: number;
    method?: string | null;
    paymentDate: Date | string;
  }): Promise<void> {
    try {
      const creditCode = params.method === 'transfer' ? '1.1.02' : '1.1.01';
      const [cxpAcc, creditAcc] = await Promise.all([
        this.getAccountByCode(tenantId, '2.1.01'),
        this.getAccountByCode(tenantId, creditCode),
      ]);
      if (!cxpAcc || !creditAcc) return;
      const amt = Number(params.amount);
      const dateStr = params.paymentDate instanceof Date
        ? params.paymentDate.toISOString().split('T')[0]
        : String(params.paymentDate).split('T')[0];
      const entry = await this.createJournalEntry(tenantId, {
        date: dateStr,
        description: `Pago CxP${params.supplierName ? ' — ' + params.supplierName : ''}`,
        reference: params.apId,
        lines: [
          { accountId: cxpAcc.id, debit: amt, credit: 0 },
          { accountId: creditAcc.id, debit: 0, credit: amt },
        ],
      });
      await this.postJournalEntry(entry.id, tenantId);
    } catch { /* intentionally silent */ }
  }

  async autoPostPayrollJournal(tenantId: string, params: {
    payrollId: string;
    period: string;
    grossSalary: number;
    netSalary: number;
    sfsEmployee: number;
    afpEmployee: number;
    isr: number;
    sfsEmployer: number;
    afpEmployer: number;
    paidAt: Date | string;
  }): Promise<void> {
    try {
      const [salaryAcc, sfsPatAcc, afpPatAcc, isrPayAcc, sfsPayAcc, afpPayAcc, bancoAcc] = await Promise.all([
        this.getAccountByCode(tenantId, '5.1.02'),
        this.getAccountByCode(tenantId, '5.1.03'),
        this.getAccountByCode(tenantId, '5.1.04'),
        this.getAccountByCode(tenantId, '2.1.03'),
        this.getAccountByCode(tenantId, '2.1.04'),
        this.getAccountByCode(tenantId, '2.1.05'),
        this.getAccountByCode(tenantId, '1.1.02'),
      ]);
      if (!salaryAcc || !bancoAcc) return;

      const gross = Number(params.grossSalary);
      const net = Number(params.netSalary);
      const sfsPat = Number(params.sfsEmployer);
      const afpPat = Number(params.afpEmployer);
      const sfsEmp = Number(params.sfsEmployee);
      const afpEmp = Number(params.afpEmployee);
      const isr = Number(params.isr);

      const lines: { accountId: string; debit: number; credit: number }[] = [];
      lines.push({ accountId: salaryAcc.id, debit: gross, credit: 0 });
      if (sfsPat > 0 && sfsPatAcc) lines.push({ accountId: sfsPatAcc.id, debit: sfsPat, credit: 0 });
      if (afpPat > 0 && afpPatAcc) lines.push({ accountId: afpPatAcc.id, debit: afpPat, credit: 0 });
      if (isr > 0 && isrPayAcc) lines.push({ accountId: isrPayAcc.id, debit: 0, credit: isr });
      const totalSfs = sfsEmp + sfsPat;
      const totalAfp = afpEmp + afpPat;
      if (totalSfs > 0 && sfsPayAcc) lines.push({ accountId: sfsPayAcc.id, debit: 0, credit: totalSfs });
      if (totalAfp > 0 && afpPayAcc) lines.push({ accountId: afpPayAcc.id, debit: 0, credit: totalAfp });
      lines.push({ accountId: bancoAcc.id, debit: 0, credit: net });

      const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
      const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
      if (Math.abs(totalDebit - totalCredit) > 0.10) return;

      const dateStr = params.paidAt instanceof Date
        ? params.paidAt.toISOString().split('T')[0]
        : String(params.paidAt).split('T')[0];
      const entry = await this.createJournalEntry(tenantId, {
        date: dateStr,
        description: `Nómina ${params.period}`,
        reference: params.payrollId,
        lines,
      });
      await this.postJournalEntry(entry.id, tenantId);
    } catch { /* intentionally silent */ }
  }

  async autoPostExpenseJournal(tenantId: string, params: {
    expenseId: string;
    category: string;
    description: string;
    amount: number;
    paymentMethod?: string | null;
    expenseDate: Date | string;
  }): Promise<void> {
    try {
      const CATEGORY_ACCOUNT: Record<string, string> = {
        ALQUILER: '5.1.06',
        ELECTRICIDAD: '5.1.07',
        COMUNICACIONES: '5.1.08',
        SERVICIOS_BANCARIOS: '5.2.01',
      };
      const expenseCode = CATEGORY_ACCOUNT[params.category] ?? '5.1.08'; // fallback to Comunicaciones or skip
      const creditCode = params.paymentMethod === 'transfer' ? '1.1.02' : '1.1.01';
      const [expAcc, creditAcc] = await Promise.all([
        this.getAccountByCode(tenantId, expenseCode),
        this.getAccountByCode(tenantId, creditCode),
      ]);
      if (!expAcc || !creditAcc) return;
      const amt = Number(params.amount);
      const dateStr = params.expenseDate instanceof Date
        ? params.expenseDate.toISOString().split('T')[0]
        : String(params.expenseDate).split('T')[0];
      const entry = await this.createJournalEntry(tenantId, {
        date: dateStr,
        description: `Gasto ${params.category} — ${params.description}`,
        reference: params.expenseId,
        lines: [
          { accountId: expAcc.id, debit: amt, credit: 0 },
          { accountId: creditAcc.id, debit: 0, credit: amt },
        ],
      });
      await this.postJournalEntry(entry.id, tenantId);
    } catch { /* intentionally silent */ }
  }
}
