import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CashRegisterSession, SessionStatus } from './entities/cash-register-session.entity';
import { CashRegisterExpense, CashEntryType } from './entities/cash-register-expense.entity';
import { Sale, SaleStatus } from '../sales/entities/sale.entity';
import { CashTransaction, TransactionType, PaymentMethod as CashMethod, TransactionCategory } from '../cash-bank/entities/cash-transaction.entity';
import { User } from '../users/entities/user.entity';
import { OpenSessionDto } from './dto/open-session.dto';
import { CloseSessionDto } from './dto/close-session.dto';

@Injectable()
export class CashRegisterService {
  constructor(
    @InjectRepository(CashRegisterSession)
    private readonly sessionRepo: Repository<CashRegisterSession>,
    @InjectRepository(CashRegisterExpense)
    private readonly expenseRepo: Repository<CashRegisterExpense>,
    @InjectRepository(Sale)
    private readonly saleRepo: Repository<Sale>,
    @InjectRepository(CashTransaction)
    private readonly cashTxRepo: Repository<CashTransaction>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  // ─── Abrir caja ─────────────────────────────────────────────────────────────
  // Cada usuario tiene su propia sesión. Un supermercado puede tener 3 cajeros
  // con 3 sesiones abiertas al mismo tiempo.

  async open(tenantId: string, userId: string, userName: string, dto: OpenSessionDto, branchId?: string | null): Promise<CashRegisterSession> {
    const existing = await this.sessionRepo.findOne({
      where: { tenantId, openedById: userId, status: SessionStatus.OPEN },
    });
    if (existing) throw new BadRequestException('Ya tienes una caja abierta. Ciérrala antes de abrir una nueva.');

    // Si el admin asignó un fondo al usuario, usarlo y luego limpiarlo
    const userRecord = await this.userRepo.findOne({ where: { id: userId } });
    const initialAmount = (userRecord?.pendingCashFund != null)
      ? Number(userRecord.pendingCashFund)
      : (dto.initialAmount ?? 0);

    const session = this.sessionRepo.create({
      tenantId, branchId: branchId ?? null,
      openedById: userId, openedByName: userName,
      initialAmount, notes: dto.notes,
      openedAt: new Date(), status: SessionStatus.OPEN,
    });
    const saved = await this.sessionRepo.save(session);

    // Limpiar el fondo pendiente después de consumirlo
    if (userRecord?.pendingCashFund != null) {
      userRecord.pendingCashFund     = null;
      userRecord.pendingCashFundNote = null;
      userRecord.pendingCashFundBy   = null;
      await this.userRepo.save(userRecord);
    }

    return saved;
  }

  /** Devuelve el fondo pendiente asignado al usuario (para mostrarlo en la UI antes de abrir) */
  async getPendingFund(userId: string): Promise<{ amount: number | null; note: string | null; assignedBy: string | null }> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    return {
      amount:     user?.pendingCashFund     ? Number(user.pendingCashFund) : null,
      note:       user?.pendingCashFundNote ?? null,
      assignedBy: user?.pendingCashFundBy   ?? null,
    };
  }

  // ─── Cerrar caja ─────────────────────────────────────────────────────────────

  async close(tenantId: string, userId: string, userName: string, dto: CloseSessionDto): Promise<CashRegisterSession> {
    const session = await this.getCurrent(tenantId, userId);
    const entries  = await this.expenseRepo.find({ where: { sessionId: session.id } });

    const totalExpenses    = entries.filter(e => e.type === CashEntryType.EXPENSE)
                                    .reduce((s, e) => s + Number(e.amount), 0);
    const totalWithdrawals = entries.filter(e => e.type === CashEntryType.WITHDRAWAL)
                                    .reduce((s, e) => s + Number(e.amount), 0);
    const totalExtraIncome = entries.filter(e => e.type === CashEntryType.INCOME)
                                    .reduce((s, e) => s + Number(e.amount), 0);

    // Re-calcular ventas vinculadas a esta sesión específica
    const salesSummary = await this.getSalesBySession(session.id);

    // Fórmula completa:
    // fondo + ventas_efectivo + cobros_fiado + ingresos_extras - gastos - retiros
    const expectedCash =
      Number(session.initialAmount)
      + Number(salesSummary.cash)
      + Number(session.totalFiadoCollections)
      + totalExtraIncome
      - totalExpenses
      - totalWithdrawals;

    session.closedById          = userId;
    session.closedByName        = userName;
    session.totalCashSales      = salesSummary.cash;
    session.totalCardSales      = salesSummary.card;
    session.totalTransferSales  = salesSummary.transfer;
    session.totalSales          = salesSummary.total;
    session.saleCount           = salesSummary.count;
    session.totalExpenses       = totalExpenses;
    session.totalWithdrawals    = totalWithdrawals;
    session.totalExtraIncome    = totalExtraIncome;
    session.expectedCash        = Math.round(expectedCash * 100) / 100;
    session.actualCash          = dto.actualCash;
    session.cashDifference      = Math.round((Number(dto.actualCash) - expectedCash) * 100) / 100;
    session.notes               = dto.notes ?? session.notes;
    session.status              = SessionStatus.CLOSED;
    session.closedAt            = new Date();

    const saved = await this.sessionRepo.save(session);

    // Auto-registrar en Caja y Bancos al cerrar
    if (salesSummary.total > 0) {
      await this.cashTxRepo.save(this.cashTxRepo.create({
        tenantId,
        type: TransactionType.INCOME,
        method: CashMethod.CASH,
        category: TransactionCategory.SALE,
        transactionDate: new Date(),
        description: `Cierre de caja — ${salesSummary.count} ventas (${userName})`,
        amount: salesSummary.total,
        reference: session.id,
        notes: `Turno cerrado por ${userName}`,
      }));
    }
    if (totalExpenses + totalWithdrawals > 0) {
      await this.cashTxRepo.save(this.cashTxRepo.create({
        tenantId,
        type: TransactionType.EXPENSE,
        method: CashMethod.CASH,
        category: TransactionCategory.EXPENSE,
        transactionDate: new Date(),
        description: `Egresos de caja — ${userName}`,
        amount: totalExpenses + totalWithdrawals,
        reference: session.id,
      }));
    }

    return saved;
  }

  // ─── Sesión activa del usuario ───────────────────────────────────────────────

  async getCurrent(tenantId: string, userId: string): Promise<CashRegisterSession> {
    const session = await this.sessionRepo.findOne({
      where: { tenantId, openedById: userId, status: SessionStatus.OPEN },
    });
    if (!session) throw new NotFoundException('No tienes ninguna caja abierta en este momento.');
    return session;
  }

  async getCurrentOrNull(tenantId: string, userId: string): Promise<CashRegisterSession | null> {
    return this.sessionRepo.findOne({
      where: { tenantId, openedById: userId, status: SessionStatus.OPEN },
    });
  }

  // ─── Resumen del turno activo ────────────────────────────────────────────────

  async getSalesSummary(tenantId: string, userId: string): Promise<object> {
    const session  = await this.getCurrent(tenantId, userId);
    const summary  = await this.getSalesBySession(session.id);
    const entries  = await this.expenseRepo.find({ where: { sessionId: session.id } });

    const totalExpenses    = entries.filter(e => e.type === CashEntryType.EXPENSE)
                                    .reduce((s, e) => s + Number(e.amount), 0);
    const totalWithdrawals = entries.filter(e => e.type === CashEntryType.WITHDRAWAL)
                                    .reduce((s, e) => s + Number(e.amount), 0);
    const totalExtraIncome = entries.filter(e => e.type === CashEntryType.INCOME)
                                    .reduce((s, e) => s + Number(e.amount), 0);

    const expectedCash =
      Number(session.initialAmount)
      + Number(summary.cash)
      + Number(session.totalFiadoCollections)
      + totalExtraIncome
      - totalExpenses
      - totalWithdrawals;

    return {
      session,
      sales: summary,
      entries,
      totalExpenses,
      totalWithdrawals,
      totalExtraIncome,
      totalFiadoCollections: Number(session.totalFiadoCollections),
      expectedCash: Math.round(expectedCash * 100) / 100,
    };
  }

  // ─── Historial — cajero ve solo las suyas, admin/owner ven todas ─────────────

  async getHistory(tenantId: string, userId: string, role: string, branchId?: string | null, limit = 30): Promise<CashRegisterSession[]> {
    const where: any = { tenantId };
    if (role === 'cashier') where.openedById = userId; // cajero ve solo las suyas
    if (branchId) where.branchId = branchId; // owner/admin filtrado por sucursal
    return this.sessionRepo.find({ where, order: { openedAt: 'DESC' }, take: limit });
  }

  // ─── Registrar egreso / retiro / ingreso ─────────────────────────────────────

  async addEntry(
    tenantId: string,
    userId: string,
    dto: { amount: number; description: string; category?: string; type?: CashEntryType },
  ): Promise<CashRegisterExpense> {
    const session = await this.getCurrent(tenantId, userId);
    const type    = dto.type ?? CashEntryType.EXPENSE;

    const entry = this.expenseRepo.create({
      tenantId, sessionId: session.id,
      type,
      amount: dto.amount, description: dto.description,
      category: dto.category ?? 'GENERAL',
      expenseAt: new Date(),
    });
    const saved = await this.expenseRepo.save(entry);

    // Actualizar totales en la sesión
    if (type === CashEntryType.EXPENSE)    session.totalExpenses    = Number(session.totalExpenses)    + Number(dto.amount);
    if (type === CashEntryType.WITHDRAWAL) session.totalWithdrawals = Number(session.totalWithdrawals) + Number(dto.amount);
    if (type === CashEntryType.INCOME)     session.totalExtraIncome = Number(session.totalExtraIncome) + Number(dto.amount);
    await this.sessionRepo.save(session);

    return saved;
  }

  async getEntries(tenantId: string, userId: string): Promise<CashRegisterExpense[]> {
    const session = await this.getCurrent(tenantId, userId);
    return this.expenseRepo.find({ where: { sessionId: session.id }, order: { expenseAt: 'DESC' } });
  }

  // ─── Llamado desde AccountsReceivable al cobrar un fiado en efectivo ─────────

  async registerFiadoCollection(tenantId: string, userId: string, amount: number): Promise<void> {
    const session = await this.getCurrentOrNull(tenantId, userId);
    if (!session) return; // si no hay caja abierta, no se registra
    session.totalFiadoCollections = Number(session.totalFiadoCollections) + amount;
    await this.sessionRepo.save(session);
  }

  // ─── Ventas vinculadas a una sesión específica ───────────────────────────────

  private async getSalesBySession(
    sessionId: string,
  ): Promise<{ cash: number; card: number; transfer: number; credit: number; total: number; count: number }> {
    const sales = await this.saleRepo.find({
      where: { cashRegisterSessionId: sessionId, status: SaleStatus.ISSUED },
    });

    let cash = 0, card = 0, transfer = 0, credit = 0;
    for (const sale of sales) {
      const amount = Number(sale.total);
      if (sale.paymentMethod === 'card')     card     += amount;
      else if (sale.paymentMethod === 'transfer') transfer += amount;
      else if (sale.paymentMethod === 'credit')   credit   += amount;
      else cash += amount;
    }
    return { cash, card, transfer, credit, total: cash + card + transfer + credit, count: sales.length };
  }
}
