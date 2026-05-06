import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { Payroll, PayrollStatus, PayrollType, PayrollFrequency } from './entities/payroll.entity';
import { CreatePayrollDto } from './dto/create-payroll.dto';
import { Employee, EmployeeStatus } from '../employees/entities/employee.entity';
import { AccountingService } from '../accounting/accounting.service';
import { Expense } from '../expenses/entities/expense.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { Tenant } from '../tenants/entities/tenant.entity';

@Injectable()
export class PayrollService {
  private readonly logger = new Logger(PayrollService.name);

  constructor(
    @InjectRepository(Payroll)
    private readonly payrollRepo: Repository<Payroll>,
    @InjectRepository(Employee)
    private readonly empRepo: Repository<Employee>,
    @InjectRepository(Expense)
    private readonly expenseRepo: Repository<Expense>,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    private readonly accountingService: AccountingService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private r(v: number) { return Math.round(v * 100) / 100; }

  // Tarifa por hora según Código Laboral RD (Art. 203): salario mensual / 30 / 8
  private hourlyRate(baseSalary: number): number { return this.r(baseSalary / 30 / 8); }

  // Calcula el monto de horas extras desglosado por tipo
  calcOvertimeFromHours(baseSalary: number, dto: { overtimeHoursDiurnas?: number; overtimeHoursNocturnas?: number; overtimeHoursFeriados?: number }): {
    overtimeAmount: number; diurnasAmt: number; nocturnasAmt: number; feriadosAmt: number;
  } {
    const hr = this.hourlyRate(baseSalary);
    const diurnasAmt   = this.r(hr * 1.35 * (dto.overtimeHoursDiurnas ?? 0));
    const nocturnasAmt = this.r(hr * 1.15 * (dto.overtimeHoursNocturnas ?? 0));
    const feriadosAmt  = this.r(hr * 2.00 * (dto.overtimeHoursFeriados ?? 0));
    return { overtimeAmount: this.r(diurnasAmt + nocturnasAmt + feriadosAmt), diurnasAmt, nocturnasAmt, feriadosAmt };
  }

  // Cálculo de vacaciones (Código Laboral RD Art. 177-178)
  calcVacaciones(baseSalary: number, yearsOfService: number): object {
    const days   = yearsOfService < 5 ? 14 : 18;
    const daily  = this.r(baseSalary / 30);
    const amount = this.r(daily * days);
    return {
      yearsOfService, days, dailyRate: daily, amount,
      note: yearsOfService < 5
        ? '14 días (menos de 5 años de servicio — Art. 177 Código Laboral RD)'
        : '18 días (5 años o más de servicio — Art. 178 Código Laboral RD)',
    };
  }

  private calculateISR(annualIncome: number): number {
    // Tabla ISR 2025 - Ley 288-04 actualizada por DGII
    if (annualIncome <= 416220) return 0;
    if (annualIncome <= 624329) return (annualIncome - 416220) * 0.15;
    if (annualIncome <= 867123) return 31216 + (annualIncome - 624329) * 0.20;
    return 79776 + (annualIncome - 867123) * 0.25;
  }

  private calculateDeductions(grossSalary: number, otherDeductions = 0) {
    const sfsEmployee = this.r(grossSalary * 0.0304);
    const afpEmployee = this.r(grossSalary * 0.0287);
    const isr = this.r(this.calculateISR(grossSalary * 12) / 12);
    const sfsEmployer = this.r(grossSalary * 0.0709);
    const afpEmployer = this.r(grossSalary * 0.0710);
    const srl = this.r(grossSalary * 0.0120);
    const totalDeductions = this.r(sfsEmployee + afpEmployee + isr + otherDeductions);
    const netSalary = this.r(grossSalary - totalDeductions);
    const employerCost = this.r(grossSalary + sfsEmployer + afpEmployer + srl);
    return { sfsEmployee, afpEmployee, isr, sfsEmployer, afpEmployer, srl, totalDeductions, netSalary, employerCost };
  }

  async create(tenantId: string, dto: CreatePayrollDto, branchId: string | null = null): Promise<Payroll> {
    // Auto-calculate overtime from hours if hours are provided
    const hasHours = (dto.overtimeHoursDiurnas ?? 0) + (dto.overtimeHoursNocturnas ?? 0) + (dto.overtimeHoursFeriados ?? 0) > 0;
    const overtimeAmount = hasHours
      ? this.calcOvertimeFromHours(dto.baseSalary, dto).overtimeAmount
      : (dto.overtime ?? 0);
    const grossSalary = dto.baseSalary + overtimeAmount + (dto.bonuses ?? 0) + (dto.commission ?? 0);

    // Regalía Navideña: exenta de TSS (SFS/AFP/SRL) — Art. 219 Código Laboral RD
    let deductions: ReturnType<typeof this.calculateDeductions>;
    if (dto.type === PayrollType.REGALIA_PASCUAL) {
      const isr = this.r(this.calculateISR(grossSalary * 12) / 12);
      const totalDeductions = isr + (dto.otherDeductions ?? 0);
      deductions = {
        sfsEmployee: 0, afpEmployee: 0, isr,
        sfsEmployer: 0, afpEmployer: 0, srl: 0,
        totalDeductions: this.r(totalDeductions),
        netSalary: this.r(grossSalary - totalDeductions),
        employerCost: this.r(grossSalary),
      };
    } else {
      deductions = this.calculateDeductions(grossSalary, dto.otherDeductions ?? 0);
    }

    const payroll = this.payrollRepo.create({
      tenantId,
      branchId,
      employeeId: dto.employeeId,
      period: dto.period,
      type: dto.type ?? PayrollType.REGULAR,
      frequency: dto.frequency ?? PayrollFrequency.MONTHLY,
      periodStart: dto.periodStart ?? null,
      periodEnd: dto.periodEnd ?? null,
      baseSalary: dto.baseSalary,
      overtime: overtimeAmount,
      bonuses: dto.bonuses ?? 0,
      commission: dto.commission ?? 0,
      grossSalary,
      otherDeductions: dto.otherDeductions ?? 0,
      notes: dto.notes,
      ...deductions,
    });

    return this.payrollRepo.save(payroll);
  }

  async preview(dto: CreatePayrollDto): Promise<object> {
    const diurnasHours   = dto.overtimeHoursDiurnas ?? 0;
    const nocturnasHours = dto.overtimeHoursNocturnas ?? 0;
    const feriadosHours  = dto.overtimeHoursFeriados ?? 0;
    const hasHours = diurnasHours + nocturnasHours + feriadosHours > 0;
    const { overtimeAmount, diurnasAmt, nocturnasAmt, feriadosAmt } = hasHours
      ? this.calcOvertimeFromHours(dto.baseSalary, dto)
      : { overtimeAmount: dto.overtime ?? 0, diurnasAmt: 0, nocturnasAmt: 0, feriadosAmt: 0 };
    const grossSalary = dto.baseSalary + overtimeAmount + (dto.bonuses ?? 0) + (dto.commission ?? 0);

    const overtimeBreakdown = hasHours ? {
      diurnasHours, nocturnasHours, feriadosHours,
      diurnasAmt, nocturnasAmt, feriadosAmt, overtimeAmount,
    } : undefined;

    if (dto.type === PayrollType.REGALIA_PASCUAL) {
      const isr = this.r(this.calculateISR(grossSalary * 12) / 12);
      return {
        grossSalary, overtimeBreakdown,
        sfsEmployee: 0, afpEmployee: 0, isr,
        sfsEmployer: 0, afpEmployer: 0, srl: 0,
        totalDeductions: isr,
        netSalary: this.r(grossSalary - isr),
        employerCost: grossSalary,
        note: 'Regalía Navideña: exenta de SFS/AFP/SRL (Art. 219 Código Laboral RD)',
      };
    }
    return { grossSalary, overtimeBreakdown, ...this.calculateDeductions(grossSalary, dto.otherDeductions ?? 0) };
  }

  async calculateRegalíaPascual(tenantId: string, employeeId: string, year: number): Promise<object> {
    const payrolls = await this.payrollRepo.find({
      where: { tenantId, employeeId, type: PayrollType.REGULAR },
      order: { createdAt: 'DESC' },
    });
    const last12 = payrolls.slice(0, 12);
    const avgSalary = last12.length > 0
      ? last12.reduce((s, p) => s + Number(p.grossSalary), 0) / last12.length
      : 0;

    return {
      employeeId, year,
      averageSalary: this.r(avgSalary),
      regaliaPascual: this.r(avgSalary),
      note: 'Equivale a 1 salario mensual promedio (últimos 12 meses). Art. 219 Código Laboral RD.',
    };
  }

  async calculatePrestaciones(tenantId: string, employeeId: string, yearsOfService: number, lastSalary: number): Promise<object> {
    const daily = lastSalary / 30;

    // ── Preaviso (Art. 76) ── en días de salario
    let preavisoDays = 0;
    if (yearsOfService >= 0.25 && yearsOfService < 0.5) preavisoDays = 7;   // 1 semana
    else if (yearsOfService >= 0.5 && yearsOfService < 1) preavisoDays = 14; // 2 semanas
    else if (yearsOfService >= 1) preavisoDays = 28;                         // 28 días (≈1 mes)
    const preavisoAmt = this.r(daily * preavisoDays);

    // ── Cesantía (Art. 224) ── escala: 6d / 13d / 21d×año (<5a) / 23d×año (≥5a)
    let cesantiaDays = 0;
    if (yearsOfService >= 0.25 && yearsOfService < 0.5) cesantiaDays = 6;
    else if (yearsOfService >= 0.5 && yearsOfService < 1) cesantiaDays = 13;
    else if (yearsOfService >= 1 && yearsOfService < 5) cesantiaDays = Math.floor(21 * yearsOfService);
    else if (yearsOfService >= 5) cesantiaDays = Math.floor(23 * yearsOfService);
    const cesantiaAmt = this.r(daily * cesantiaDays);

    // ── Vacaciones (Art. 177-178) ── 14 días fijos <5 años / 18 días ≥5 años
    const vacacionesDays = yearsOfService < 5 ? 14 : 18;
    const vacacionesAmt = this.r(daily * vacacionesDays);

    // ── Regalía Proporcional (Art. 219) ── meses trabajados en el año en curso
    const monthsWorked = Math.min(yearsOfService * 12, 12);
    const regaliaAmt = this.r((lastSalary / 12) * monthsWorked);

    const total = this.r(preavisoAmt + cesantiaAmt + vacacionesAmt + regaliaAmt);

    return {
      employeeId, yearsOfService, lastSalary,
      preaviso:            { days: preavisoDays,    amount: preavisoAmt },
      cesantia:            { days: cesantiaDays,    amount: cesantiaAmt },
      vacaciones:          { days: vacacionesDays,  amount: vacacionesAmt },
      regaliaProporcional: regaliaAmt,
      total,
      note: 'Calculado según Código Laboral RD (Ley 16-92)',
    };
  }

  async findAll(tenantId: string, branchId: string | null = null): Promise<Payroll[]> {
    const where: any = { tenantId };
    if (branchId !== null) where.branchId = branchId;
    return this.payrollRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  // Busca las nóminas de un empleado por userId o nombre (para el portal del empleado)
  async findMyPayroll(tenantId: string, userId: string, firstName: string, lastName: string): Promise<Payroll[]> {
    // Try by userId first (most reliable)
    let emp = await this.empRepo.findOne({ where: { tenantId, userId } });
    // Fallback: match by name
    if (!emp) {
      emp = await this.empRepo.findOne({ where: { tenantId, firstName, lastName } });
    }
    if (!emp) return [];
    return this.payrollRepo.find({
      where: { tenantId, employeeId: emp.id },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, tenantId: string): Promise<Payroll> {
    const p = await this.payrollRepo.findOne({ where: { id, tenantId } });
    if (!p) throw new NotFoundException('Nómina no encontrada');
    return p;
  }

  async approve(id: string, tenantId: string): Promise<Payroll> {
    const p = await this.findOne(id, tenantId);
    if (p.status !== PayrollStatus.DRAFT)
      throw new BadRequestException('Solo se pueden aprobar nóminas en borrador');
    p.status = PayrollStatus.APPROVED;
    return this.payrollRepo.save(p);
  }

  async markPaid(id: string, tenantId: string): Promise<Payroll> {
    const p = await this.findOne(id, tenantId);
    if (p.status !== PayrollStatus.APPROVED)
      throw new BadRequestException('Solo se pueden pagar nóminas aprobadas');
    p.status = PayrollStatus.PAID;
    p.paidAt = new Date();
    const saved = await this.payrollRepo.save(p);

    // Auto-crear gasto de tipo SUELDOS para que aparezca en el resumen de gastos
    const emp = await this.empRepo.findOne({ where: { id: p.employeeId } });
    const empName = emp ? `${emp.firstName} ${emp.lastName}` : 'Empleado';
    await this.expenseRepo.save(this.expenseRepo.create({
      tenantId,
      branchId: p.branchId ?? null,
      category: 'SUELDOS',
      description: `Nómina ${p.period} — ${empName}`,
      amount: Number(p.netSalary),
      expenseDate: saved.paidAt!,
      reference: saved.id,
      notes: `Salario bruto: RD$${Number(p.grossSalary).toFixed(2)} · SFS: RD$${Number(p.sfsEmployee).toFixed(2)} · AFP: RD$${Number(p.afpEmployee).toFixed(2)} · ISR: RD$${Number(p.isr).toFixed(2)}`,
      paymentMethod: 'TRANSFERENCIA',
    }));

    this.accountingService.autoPostPayrollJournal(tenantId, {
      payrollId: id,
      period: p.period,
      grossSalary: Number(p.grossSalary),
      netSalary: Number(p.netSalary),
      sfsEmployee: Number(p.sfsEmployee),
      afpEmployee: Number(p.afpEmployee),
      isr: Number(p.isr),
      sfsEmployer: Number(p.sfsEmployer),
      afpEmployer: Number(p.afpEmployer),
      paidAt: saved.paidAt!,
    }).catch(() => {});

    return saved;
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const p = await this.payrollRepo.findOne({ where: { id, tenantId } });
    if (!p) throw new NotFoundException('Nómina no encontrada');
    if (p.status !== PayrollStatus.DRAFT)
      throw new BadRequestException('Solo se pueden eliminar nóminas en borrador');
    await this.payrollRepo.delete(id);
  }

  async exportTssCsv(tenantId: string, period?: string): Promise<string> {
    const qb = this.payrollRepo.createQueryBuilder('p')
      .where('p.tenantId = :tenantId', { tenantId })
      .andWhere('p.status IN (:...statuses)', { statuses: [PayrollStatus.DRAFT, PayrollStatus.APPROVED, PayrollStatus.PAID] });
    if (period) qb.andWhere('p.period = :period', { period });
    const payrolls = await qb.getMany();

    const empIds = [...new Set(payrolls.map(p => p.employeeId).filter(Boolean))];
    const employees = empIds.length > 0 ? await this.empRepo.findBy({ id: In(empIds) }) : [];
    const empMap = new Map(employees.map(e => [e.id, e]));

    const freqLabel: Record<string, string> = { WEEKLY: 'Semanal', BIWEEKLY: 'Quincenal', MONTHLY: 'Mensual' };
    const periodStr = (p: Payroll) =>
      p.periodStart && p.periodEnd
        ? `${p.periodStart} al ${p.periodEnd}`
        : p.period;

    const header = '\uFEFFCédula,Nombre,Período,Frecuencia,Salario Bruto,SFS Empleado,AFP Empleado,SFS Patronal,AFP Patronal,ISR';
    const rows = payrolls.map(p => {
      const emp = empMap.get(p.employeeId);
      const cedula = emp?.cedula ?? '';
      const nombre = emp ? `${emp.firstName} ${emp.lastName}` : (p.employeeId ?? '');
      return [
        cedula, nombre, periodStr(p), freqLabel[p.frequency] ?? p.frequency,
        Number(p.grossSalary).toFixed(2), Number(p.sfsEmployee).toFixed(2), Number(p.afpEmployee).toFixed(2),
        Number(p.sfsEmployer).toFixed(2), Number(p.afpEmployer).toFixed(2), Number(p.isr).toFixed(2),
      ].map(v => `"${v}"`).join(',');
    });
    return [header, ...rows].join('\r\n');
  }

  // ─── Automatización: genera nóminas en borrador el 1° de cada mes ──────────

  @Cron('0 7 1 * *') // 7:00 AM el día 1 de cada mes
  async autoGenerateMonthlyPayrolls() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const period = `${year}-${String(month).padStart(2, '0')}`;
    const periodStart = `${period}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const periodEnd = `${period}-${String(lastDay).padStart(2, '0')}`;

    this.logger.log(`[Nómina Auto] Generando borradores para período ${period}`);

    const tenants = await this.tenantRepo.find();

    for (const tenant of tenants) {
      try {
        const employees = await this.empRepo.find({
          where: { tenantId: tenant.id, status: EmployeeStatus.ACTIVE },
        });

        const eligible = employees.filter(e => e.baseSalary && Number(e.baseSalary) > 0);
        let created = 0;

        for (const emp of eligible) {
          const existing = await this.payrollRepo.findOne({
            where: { tenantId: tenant.id, employeeId: emp.id, period, type: PayrollType.REGULAR },
          });
          if (existing) continue;

          await this.create(tenant.id, {
            employeeId: emp.id,
            period,
            periodStart,
            periodEnd,
            type: PayrollType.REGULAR,
            frequency: PayrollFrequency.MONTHLY,
            baseSalary: Number(emp.baseSalary),
          } as CreatePayrollDto, emp.branchId ?? null);
          created++;
        }

        if (created > 0) {
          const mes = now.toLocaleString('es-DO', { month: 'long', year: 'numeric' });
          await this.notificationsService.create(
            tenant.id,
            'info',
            'Nóminas generadas automáticamente',
            `Se generaron ${created} nómina${created !== 1 ? 's' : ''} en borrador para ${mes}. Revísalas y apruébalas en el módulo de Nómina.`,
            '/dashboard/payroll',
          );
          this.logger.log(`[Nómina Auto] Tenant ${tenant.id}: ${created} nóminas creadas para ${period}`);
        }
      } catch (err) {
        this.logger.error(`[Nómina Auto] Error en tenant ${tenant.id}: ${err.message}`);
      }
    }
  }

  async exportAchCsv(tenantId: string, period?: string): Promise<string> {
    const qb = this.payrollRepo.createQueryBuilder('p')
      .where('p.tenantId = :tenantId', { tenantId })
      .andWhere('p.status IN (:...statuses)', { statuses: [PayrollStatus.DRAFT, PayrollStatus.APPROVED, PayrollStatus.PAID] });
    if (period) qb.andWhere('p.period = :period', { period });
    const payrolls = await qb.getMany();

    // Fetch employees in batch
    const empIds = [...new Set(payrolls.map(p => p.employeeId).filter(Boolean))];
    const employees = empIds.length > 0
      ? await this.empRepo.findBy({ id: In(empIds) })
      : [];
    const empMap = new Map(employees.map(e => [e.id, e]));

    const freqLabelAch: Record<string, string> = { WEEKLY: 'Semanal', BIWEEKLY: 'Quincenal', MONTHLY: 'Mensual' };
    const periodStrAch = (p: Payroll) =>
      p.periodStart && p.periodEnd
        ? `${p.periodStart} al ${p.periodEnd}`
        : p.period;

    const header = '\uFEFFCédula,Nombre,Período,Frecuencia,Salario Bruto,SFS Empleado,AFP Empleado,ISR,Salario Neto,Estado';
    const rows = payrolls.map(p => {
      const emp = empMap.get(p.employeeId);
      const cedula = emp?.cedula ?? '';
      const nombre = emp ? `${emp.firstName} ${emp.lastName}` : (p.employeeId ?? '');
      const estadoLabel: Record<string, string> = { DRAFT: 'Borrador', APPROVED: 'Aprobada', PAID: 'Pagada' };
      return [
        cedula, nombre, periodStrAch(p), freqLabelAch[p.frequency] ?? p.frequency,
        Number(p.grossSalary).toFixed(2), Number(p.sfsEmployee).toFixed(2), Number(p.afpEmployee).toFixed(2),
        Number(p.isr).toFixed(2), Number(p.netSalary).toFixed(2), estadoLabel[p.status] ?? p.status,
      ].map(v => `"${v}"`).join(',');
    });
    return [header, ...rows].join('\r\n');
  }
}
