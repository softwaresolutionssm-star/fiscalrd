import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sale, SaleStatus } from '../sales/entities/sale.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Product } from '../products/entities/product.entity';
import { Employee, EmployeeStatus } from '../employees/entities/employee.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { AccountsReceivable, ArStatus } from '../accounts-receivable/entities/accounts-receivable.entity';
import { PLAN_LIMITS, TenantPlan } from '../common/enums/plan.enum';

@Injectable()
export class StatsService {
  constructor(
    @InjectRepository(Sale) private saleRepo: Repository<Sale>,
    @InjectRepository(Customer) private customerRepo: Repository<Customer>,
    @InjectRepository(Product) private productRepo: Repository<Product>,
    @InjectRepository(Employee) private employeeRepo: Repository<Employee>,
    @InjectRepository(Tenant) private tenantRepo: Repository<Tenant>,
    @InjectRepository(AccountsReceivable) private arRepo: Repository<AccountsReceivable>,
  ) {}

  async getDashboardStats(tenantId: string, branchId: string | null = null, from?: string, to?: string): Promise<object> {
    const now = new Date();

    // Custom range OR current month
    const curStart = from ? new Date(from + 'T00:00:00') : new Date(now.getFullYear(), now.getMonth(), 1);
    const curEnd   = to   ? new Date(to   + 'T23:59:59') : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Previous period (same length as current)
    const rangeDays = Math.round((curEnd.getTime() - curStart.getTime()) / 86400000);
    const prevEnd   = new Date(curStart.getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - rangeDays * 86400000);

    const [
      currentSalesRaw,
      prevSalesRaw,
      totalCustomers,
      totalProducts,
      totalEmployees,
      cancelledSales,
      tenant,
      arPending,
      monthInvoiceCount,
    ] = await Promise.all([
      // Ventas mes actual via GROUP BY
      (() => {
        const qb = this.saleRepo.createQueryBuilder('s')
          .select('SUM(s.total)', 'total').addSelect('SUM(s.itbisTotal)', 'itbis')
          .addSelect('SUM(s.subtotal)', 'subtotal').addSelect('COUNT(*)', 'count')
          .where('s.tenantId = :tenantId', { tenantId })
          .andWhere('s.status = :status', { status: SaleStatus.ISSUED })
          .andWhere('s.saleDate >= :start', { start: curStart })
          .andWhere('s.saleDate <= :end', { end: curEnd });
        if (branchId) qb.andWhere('s.branchId = :branchId', { branchId });
        return qb.getRawOne();
      })(),

      // Ventas mes anterior
      (() => {
        const qb = this.saleRepo.createQueryBuilder('s')
          .select('SUM(s.total)', 'total').addSelect('COUNT(*)', 'count')
          .where('s.tenantId = :tenantId', { tenantId })
          .andWhere('s.status = :status', { status: SaleStatus.ISSUED })
          .andWhere('s.saleDate >= :start', { start: prevStart })
          .andWhere('s.saleDate <= :end', { end: prevEnd });
        if (branchId) qb.andWhere('s.branchId = :branchId', { branchId });
        return qb.getRawOne();
      })(),

      this.customerRepo.count({ where: { tenantId, isActive: true } }),
      this.productRepo.count({ where: { tenantId, isActive: true } }),
      this.employeeRepo.count({ where: branchId ? { tenantId, branchId, status: EmployeeStatus.ACTIVE } : { tenantId, status: EmployeeStatus.ACTIVE } }),
      this.saleRepo.count({ where: branchId ? { tenantId, branchId, status: SaleStatus.CANCELLED } : { tenantId, status: SaleStatus.CANCELLED } }),
      this.tenantRepo.findOne({ where: { id: tenantId }, select: { plan: true } }),

      // AR pendiente
      (() => {
        const qb = this.arRepo.createQueryBuilder('ar')
          .select('SUM(ar.balance)', 'total').addSelect('COUNT(*)', 'count')
          .where('ar.tenantId = :tenantId', { tenantId })
          .andWhere('ar.status = :status', { status: ArStatus.PENDING });
        if (branchId) qb.andWhere('ar.branchId = :branchId', { branchId });
        return qb.getRawOne();
      })(),

      // Facturas emitidas este mes (para límite de plan)
      (() => {
        const qb = this.saleRepo.createQueryBuilder('s')
          .where('s.tenantId = :tenantId', { tenantId })
          .andWhere('s.status = :status', { status: SaleStatus.ISSUED })
          .andWhere('s.saleDate >= :start', { start: curStart })
          .andWhere('s.saleDate <= :end', { end: curEnd });
        if (branchId) qb.andWhere('s.branchId = :branchId', { branchId });
        return qb.getCount();
      })(),
    ]);

    const salesTotal   = parseFloat(currentSalesRaw?.total ?? '0');
    const itbisTotal   = parseFloat(currentSalesRaw?.itbis ?? '0');
    const subtotal     = parseFloat(currentSalesRaw?.subtotal ?? '0');
    const salesCount   = parseInt(currentSalesRaw?.count ?? '0', 10);

    const prevTotal    = parseFloat(prevSalesRaw?.total ?? '0');
    const prevCount    = parseInt(prevSalesRaw?.count ?? '0', 10);

    const growthPct = prevTotal > 0
      ? Math.round(((salesTotal - prevTotal) / prevTotal) * 100)
      : salesTotal > 0 ? 100 : 0;

    const plan = (tenant?.plan as TenantPlan) ?? TenantPlan.FREE;
    const planLimit = PLAN_LIMITS[plan];

    return {
      period: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
      sales: { total: salesTotal, itbis: itbisTotal, subtotal, count: salesCount },
      prevMonth: { total: prevTotal, count: prevCount },
      growthPct,
      cancelled: cancelledSales,
      customers: totalCustomers,
      products: totalProducts,
      employees: totalEmployees,
      arPending: {
        total: parseFloat(arPending?.total ?? '0'),
        count: parseInt(arPending?.count ?? '0', 10),
      },
      plan: {
        name: plan,
        invoicesUsed: monthInvoiceCount,
        invoicesLimit: planLimit.invoices < 999999999 ? planLimit.invoices : null,
        usagePct: planLimit.invoices < 999999999
          ? Math.round((monthInvoiceCount / planLimit.invoices) * 100)
          : 0,
      },
    };
  }

  async getDailyStats(tenantId: string, branchId: string | null = null, days = 7): Promise<{ date: string; total: number }[]> {
    const now = new Date();
    const since = new Date(now);
    since.setDate(since.getDate() - (days - 1));
    since.setHours(0, 0, 0, 0);

    // Un solo GROUP BY en lugar de N queries
    const qb = this.saleRepo
      .createQueryBuilder('s')
      .select("TO_CHAR(s.saleDate, 'YYYY-MM-DD')", 'date')
      .addSelect('SUM(s.total)', 'total')
      .where('s.tenantId = :tenantId', { tenantId })
      .andWhere('s.status = :status', { status: SaleStatus.ISSUED })
      .andWhere('s.saleDate >= :since', { since })
      .groupBy("TO_CHAR(s.saleDate, 'YYYY-MM-DD')")
      .orderBy("TO_CHAR(s.saleDate, 'YYYY-MM-DD')", 'ASC');
    if (branchId) qb.andWhere('s.branchId = :branchId', { branchId });
    const rows = await qb.getRawMany();

    // Construir el resultado rellenando días sin ventas con 0
    const map: Record<string, number> = {};
    for (const r of rows) map[r.date] = parseFloat(r.total ?? '0');

    const result: { date: string; total: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      result.push({ date: key, total: map[key] ?? 0 });
    }
    return result;
  }

  async getTopProducts(tenantId: string, branchId: string | null = null, limit = 5): Promise<{ productName: string; qty: number; revenue: number }[]> {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);

    const qb = this.saleRepo
      .createQueryBuilder('s')
      .innerJoin('s.items', 'i')
      .select('i.productName', 'productName')
      .addSelect('SUM(i.quantity)', 'qty')
      .addSelect('SUM(i.total)', 'revenue')
      .where('s.tenantId = :tenantId', { tenantId })
      .andWhere('s.status = :status', { status: SaleStatus.ISSUED })
      .andWhere('s.saleDate >= :start', { start })
      .groupBy('i.productName')
      .orderBy('SUM(i.quantity)', 'DESC')
      .limit(limit);
    if (branchId) qb.andWhere('s.branchId = :branchId', { branchId });
    const rows = await qb.getRawMany();

    return rows.map(r => ({
      productName: r.productName,
      qty: parseFloat(r.qty ?? '0'),
      revenue: parseFloat(r.revenue ?? '0'),
    }));
  }

  async report607Data(tenantId: string, year: number, month: number) {
    const start = new Date(year, month - 1, 1);
    const end   = new Date(year, month, 0, 23, 59, 59);

    const sales = await this.saleRepo.find({
      where: { tenantId, status: SaleStatus.ISSUED },
      relations: ['items'],
    });

    const filtered = sales.filter(s => {
      const d = new Date(s.saleDate);
      return d >= start && d <= end;
    });

    const lines = filtered.map(s => ({
      ncfNumber:     (s as any).ncfNumber ?? '',
      ncfType:       s.ncfType ?? '',
      customerRnc:   (s as any).customerRncCedula ?? '',
      customerName:  (s as any).customerName ?? 'Consumidor Final',
      date:          new Date(s.saleDate).toISOString().split('T')[0],
      subtotal:      Number(s.subtotal),
      itbis:         Number(s.itbisTotal),
      total:         Number(s.total),
      paymentMethod: (s as any).paymentMethod ?? 'cash',
    }));

    const totals = lines.reduce(
      (acc, l) => ({ subtotal: acc.subtotal + l.subtotal, itbis: acc.itbis + l.itbis, total: acc.total + l.total }),
      { subtotal: 0, itbis: 0, total: 0 },
    );

    return { period: `${year}-${String(month).padStart(2, '0')}`, totalRecords: lines.length, totals, lines };
  }
}
