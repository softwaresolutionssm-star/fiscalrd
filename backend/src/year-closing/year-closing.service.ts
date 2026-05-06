import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { YearClosing, ClosingType } from './entities/year-closing.entity';

@Injectable()
export class YearClosingService {
  constructor(
    @InjectRepository(YearClosing)
    private readonly repo: Repository<YearClosing>,
  ) {}

  // ─── Listar cierres ────────────────────────────────────────────────────────

  // El cierre de año es SIEMPRE a nivel de tenant (consolidado).
  // No se filtra por sucursal — representa el ejercicio fiscal completo del negocio.
  async findAll(tenantId: string): Promise<YearClosing[]> {
    return this.repo.find({ where: { tenantId }, order: { year: 'DESC', closedAt: 'DESC' } });
  }

  // Preview informativo — puede ser por sucursal o consolidado para análisis
  // pero NO es el cierre oficial
  async preview(tenantId: string, year: number, branchId?: string | null): Promise<object> {
    return this.computeSummary(tenantId, year, branchId);
  }

  // ─── Ejecutar cierre ───────────────────────────────────────────────────────

  async close(tenantId: string, dto: {
    year: number;
    closedBy: string;
    notes?: string;
  }): Promise<YearClosing> {
    // Prevenir doble cierre del mismo año
    const existing = await this.repo.findOne({ where: { tenantId, year: dto.year } });
    if (existing) {
      throw new ConflictException(`Ya existe un cierre oficial para el año ${dto.year}`);
    }

    // El cierre oficial es SIEMPRE consolidado (sin branchId)
    const summary = await this.computeSummary(tenantId, dto.year, null);

    const closing = this.repo.create({
      tenantId,
      branchId: null,       // siempre consolidado
      branchName: null,
      year: dto.year,
      type: ClosingType.CONSOLIDATED,
      totalSales:     (summary as any).totalSales,
      totalPurchases: (summary as any).totalPurchases,
      totalExpenses:  (summary as any).totalExpenses,
      totalPayroll:   (summary as any).totalPayroll,
      grossProfit:    (summary as any).grossProfit,
      netResult:      (summary as any).netResult,
      details:        (summary as any).details,
      closedBy: dto.closedBy,
      notes:    dto.notes ?? null,
    });

    return this.repo.save(closing);
  }

  // ─── Validaciones pre-cierre ──────────────────────────────────────────────

  async validate(tenantId: string, year: number): Promise<object> {
    const manager = this.repo.manager;
    const yearStart = `${year}-01-01`;
    const yearEnd   = `${year}-12-31`;

    const [
      draftSales,
      pendingPayrolls,
      overdueAR,
      existingClosing,
    ] = await Promise.all([
      // Ventas en borrador del año
      manager.query(`
        SELECT COUNT(*) AS count FROM sales
        WHERE "tenantId" = $1 AND "saleDate" BETWEEN $2 AND $3 AND "status" = 'draft'
      `, [tenantId, yearStart, yearEnd]),

      // Nóminas pendientes de pago del año
      manager.query(`
        SELECT COUNT(*) AS count FROM payrolls
        WHERE "tenantId" = $1 AND "payPeriodEnd" BETWEEN $2 AND $3 AND "status" != 'paid'
      `, [tenantId, yearStart, yearEnd]),

      // Cuentas por cobrar vencidas
      manager.query(`
        SELECT COALESCE(SUM("balance"), 0) AS total FROM accounts_receivable
        WHERE "tenantId" = $1 AND "status" IN ('OVERDUE', 'PENDING', 'PARTIAL')
      `, [tenantId]),

      // ¿Ya existe cierre?
      this.repo.findOne({ where: { tenantId, year } }),
    ]);

    const warnings: string[] = [];
    const blocks: string[] = [];

    if (existingClosing) {
      blocks.push(`Ya existe un cierre oficial para el año ${year}`);
    }

    const draftCount = Number(draftSales[0]?.count ?? 0);
    if (draftCount > 0) warnings.push(`Tienes ${draftCount} factura${draftCount !== 1 ? 's' : ''} en borrador sin emitir`);

    const pendingCount = Number(pendingPayrolls[0]?.count ?? 0);
    if (pendingCount > 0) warnings.push(`Tienes ${pendingCount} nómina${pendingCount !== 1 ? 's' : ''} pendiente${pendingCount !== 1 ? 's' : ''} de pago`);

    const arTotal = Number(overdueAR[0]?.total ?? 0);
    if (arTotal > 0) {
      const fmt = (n: number) => `RD$${n.toLocaleString('es-DO', { minimumFractionDigits: 2 })}`;
      warnings.push(`Tienes ${fmt(arTotal)} en cuentas por cobrar pendientes`);
    }

    return {
      canClose: blocks.length === 0,
      blocks,
      warnings,
      alreadyClosed: !!existingClosing,
    };
  }

  // ─── Cálculo central ───────────────────────────────────────────────────────

  private async computeSummary(tenantId: string, year: number, branchId?: string | null): Promise<object> {
    const manager = this.repo.manager;
    const yearStart = `${year}-01-01`;
    const yearEnd   = `${year}-12-31`;

    // Param helper
    const branchFilter = (alias: string) =>
      branchId
        ? `AND "${alias}"."branchId" = '${branchId}'`
        : '';

    // ── Ventas ──────────────────────────────────────────────────────────────
    const salesRes = await manager.query(`
      SELECT
        COALESCE(SUM("total"), 0) AS "totalSales",
        COALESCE(SUM("subtotal"), 0) AS "subtotalSales",
        COALESCE(SUM("itbisTotal"), 0) AS "itbisSales",
        COUNT(*) AS "saleCount"
      FROM sales
      WHERE "tenantId" = $1
        AND "saleDate" BETWEEN $2 AND $3
        AND "status" != 'cancelled'
        ${branchFilter('sales')}
    `, [tenantId, yearStart, yearEnd]);

    // ── Compras ─────────────────────────────────────────────────────────────
    const purchasesRes = await manager.query(`
      SELECT
        COALESCE(SUM("total"), 0) AS "totalPurchases",
        COALESCE(SUM("itbisTotal"), 0) AS "itbisPurchases",
        COUNT(*) AS "purchaseCount"
      FROM purchases
      WHERE "tenantId" = $1
        AND "purchaseDate" BETWEEN $2 AND $3
        AND "status" != 'cancelled'
        ${branchFilter('purchases')}
    `, [tenantId, yearStart, yearEnd]);

    // ── Gastos ──────────────────────────────────────────────────────────────
    const expensesRes = await manager.query(`
      SELECT
        COALESCE(SUM("amount"), 0) AS "totalExpenses",
        COUNT(*) AS "expenseCount"
      FROM expenses
      WHERE "tenantId" = $1
        AND "expenseDate" BETWEEN $2 AND $3
        ${branchFilter('expenses')}
    `, [tenantId, yearStart, yearEnd]);

    // ── Nómina ──────────────────────────────────────────────────────────────
    const payrollRes = await manager.query(`
      SELECT
        COALESCE(SUM("netAmount"), 0) AS "totalPayroll",
        COUNT(*) AS "payrollCount"
      FROM payrolls
      WHERE "tenantId" = $1
        AND "payPeriodEnd" BETWEEN $2 AND $3
        AND "status" = 'paid'
        ${branchFilter('payrolls')}
    `, [tenantId, yearStart, yearEnd]);

    const totalSales     = Number(salesRes[0]?.totalSales     ?? 0);
    const totalPurchases = Number(purchasesRes[0]?.totalPurchases ?? 0);
    const totalExpenses  = Number(expensesRes[0]?.totalExpenses  ?? 0);
    const totalPayroll   = Number(payrollRes[0]?.totalPayroll    ?? 0);
    const grossProfit    = totalSales - totalPurchases;
    const netResult      = grossProfit - totalExpenses - totalPayroll;

    return {
      year, tenantId, branchId: branchId ?? null,
      totalSales,
      totalPurchases,
      totalExpenses,
      totalPayroll,
      grossProfit,
      netResult,
      details: {
        subtotalSales:   Number(salesRes[0]?.subtotalSales   ?? 0),
        itbisSales:      Number(salesRes[0]?.itbisSales      ?? 0),
        saleCount:       Number(salesRes[0]?.saleCount       ?? 0),
        itbisPurchases:  Number(purchasesRes[0]?.itbisPurchases ?? 0),
        purchaseCount:   Number(purchasesRes[0]?.purchaseCount  ?? 0),
        expenseCount:    Number(expensesRes[0]?.expenseCount    ?? 0),
        payrollCount:    Number(payrollRes[0]?.payrollCount     ?? 0),
      },
    };
  }
}
