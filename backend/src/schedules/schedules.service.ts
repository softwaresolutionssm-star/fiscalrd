import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { todayDR } from '../common/utils/date.utils';
import { BusinessHour } from './entities/business-hour.entity';
import { BusinessException, ExceptionType } from './entities/business-exception.entity';
import { ScheduleTemplate, WeekSchedule, WORK_DAY, EMPTY_DAY } from './entities/schedule-template.entity';
import { EmployeeSchedule } from './entities/employee-schedule.entity';
import { EmployeeScheduleException, ExceptionKind } from './entities/employee-schedule-exception.entity';
import { VacationRequest, VacationRequestStatus } from './entities/vacation-request.entity';
import { Employee } from '../employees/entities/employee.entity';

// ─── Feriados nacionales RD ───────────────────────────────────────────────────
const RD_HOLIDAYS: { month: number; day: number; name: string }[] = [
  { month: 1,  day: 1,  name: 'Año Nuevo' },
  { month: 1,  day: 21, name: 'Día de la Altagracia' },
  { month: 1,  day: 26, name: 'Día de Duarte' },
  { month: 2,  day: 27, name: 'Día de la Independencia' },
  { month: 5,  day: 1,  name: 'Día del Trabajo' },
  { month: 8,  day: 16, name: 'Día de la Restauración' },
  { month: 9,  day: 24, name: 'Día de las Mercedes' },
  { month: 11, day: 6,  name: 'Día de la Constitución' },
  { month: 12, day: 25, name: 'Navidad' },
];

// ─── Plantillas predeterminadas ───────────────────────────────────────────────
const DEFAULT_TEMPLATES: Array<{ name: string; description: string; weeklyHours: number; schedule: Partial<WeekSchedule> }> = [
  {
    name: 'Turno Completo L-V',
    description: 'Lunes a viernes 8AM-5PM, sábado 8AM-2PM',
    weeklyHours: 44,
    schedule: {
      monday: WORK_DAY('08:00', '17:00'), tuesday: WORK_DAY('08:00', '17:00'),
      wednesday: WORK_DAY('08:00', '17:00'), thursday: WORK_DAY('08:00', '17:00'),
      friday: WORK_DAY('08:00', '17:00'), saturday: WORK_DAY('08:00', '14:00'), sunday: EMPTY_DAY,
    },
  },
  {
    name: 'Turno Completo L-S',
    description: 'Lunes a sábado 8AM-5PM',
    weeklyHours: 48,
    schedule: {
      monday: WORK_DAY(), tuesday: WORK_DAY(), wednesday: WORK_DAY(),
      thursday: WORK_DAY(), friday: WORK_DAY(), saturday: WORK_DAY(), sunday: EMPTY_DAY,
    },
  },
  {
    name: 'Turno Tarde',
    description: 'Lunes a viernes 2PM-10PM',
    weeklyHours: 40,
    schedule: {
      monday: WORK_DAY('14:00', '22:00'), tuesday: WORK_DAY('14:00', '22:00'),
      wednesday: WORK_DAY('14:00', '22:00'), thursday: WORK_DAY('14:00', '22:00'),
      friday: WORK_DAY('14:00', '22:00'), saturday: EMPTY_DAY, sunday: EMPTY_DAY,
    },
  },
  {
    name: 'Turno Partido',
    description: 'Lunes a viernes 8AM-12PM y 2PM-6PM',
    weeklyHours: 40,
    schedule: {
      monday:    { isWorking: true, blocks: [{ start: '08:00', end: '12:00' }, { start: '14:00', end: '18:00' }] },
      tuesday:   { isWorking: true, blocks: [{ start: '08:00', end: '12:00' }, { start: '14:00', end: '18:00' }] },
      wednesday: { isWorking: true, blocks: [{ start: '08:00', end: '12:00' }, { start: '14:00', end: '18:00' }] },
      thursday:  { isWorking: true, blocks: [{ start: '08:00', end: '12:00' }, { start: '14:00', end: '18:00' }] },
      friday:    { isWorking: true, blocks: [{ start: '08:00', end: '12:00' }, { start: '14:00', end: '18:00' }] },
      saturday: EMPTY_DAY, sunday: EMPTY_DAY,
    },
  },
  {
    name: 'Medio Tiempo Mañana',
    description: 'Lunes a viernes 8AM-12PM',
    weeklyHours: 20,
    schedule: {
      monday: WORK_DAY('08:00', '12:00'), tuesday: WORK_DAY('08:00', '12:00'),
      wednesday: WORK_DAY('08:00', '12:00'), thursday: WORK_DAY('08:00', '12:00'),
      friday: WORK_DAY('08:00', '12:00'), saturday: EMPTY_DAY, sunday: EMPTY_DAY,
    },
  },
];

const DAY_KEYS = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'] as const;
type DayKey = typeof DAY_KEYS[number];

// Días hábiles entre dos fechas (excluye sábado y domingo)
function businessDaysBetween(from: string, to: string): number {
  const start = new Date(from + 'T12:00:00');
  const end   = new Date(to   + 'T12:00:00');
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

@Injectable()
export class SchedulesService {
  constructor(
    @InjectRepository(BusinessHour)
    private readonly bhRepo: Repository<BusinessHour>,
    @InjectRepository(BusinessException)
    private readonly beRepo: Repository<BusinessException>,
    @InjectRepository(ScheduleTemplate)
    private readonly tplRepo: Repository<ScheduleTemplate>,
    @InjectRepository(EmployeeSchedule)
    private readonly esRepo: Repository<EmployeeSchedule>,
    @InjectRepository(EmployeeScheduleException)
    private readonly eseRepo: Repository<EmployeeScheduleException>,
    @InjectRepository(VacationRequest)
    private readonly vrRepo: Repository<VacationRequest>,
    @InjectRepository(Employee)
    private readonly empRepo: Repository<Employee>,
  ) {}

  // ─── Horario del negocio ──────────────────────────────────────────────────

  async getBusinessHours(tenantId: string): Promise<BusinessHour[]> {
    const existing = await this.bhRepo.find({ where: { tenantId }, order: { dayOfWeek: 'ASC' } });
    if (existing.length === 7) return existing;
    const defaults = Array.from({ length: 7 }, (_, i) => this.bhRepo.create({
      tenantId, dayOfWeek: i,
      isOpen: i !== 0,
      openTime: '08:00', closeTime: '17:00',
      hasBreak: false, is24Hours: false,
    }));
    return this.bhRepo.save(defaults);
  }

  async upsertBusinessHours(tenantId: string, days: Partial<BusinessHour>[]): Promise<BusinessHour[]> {
    const saved: BusinessHour[] = [];
    for (const day of days) {
      const existing = await this.bhRepo.findOne({ where: { tenantId, dayOfWeek: day.dayOfWeek } });
      if (existing) {
        Object.assign(existing, day);
        saved.push(await this.bhRepo.save(existing));
      } else {
        saved.push(await this.bhRepo.save(this.bhRepo.create({ ...day, tenantId })));
      }
    }
    return saved;
  }

  // ─── Excepciones del negocio ──────────────────────────────────────────────

  async getBusinessExceptions(tenantId: string, year: number): Promise<BusinessException[]> {
    const existing = await this.beRepo.find({ where: { tenantId } });
    const existingDates = new Set(existing.map(e => e.date));
    const toCreate: BusinessException[] = [];
    for (const h of RD_HOLIDAYS) {
      const date = `${year}-${String(h.month).padStart(2, '0')}-${String(h.day).padStart(2, '0')}`;
      if (!existingDates.has(date)) {
        toCreate.push(this.beRepo.create({
          tenantId, date, isClosed: true,
          reason: h.name, type: ExceptionType.HOLIDAY, isNational: true,
        }));
      }
    }
    if (toCreate.length) await this.beRepo.save(toCreate);
    return this.beRepo.find({ where: { tenantId }, order: { date: 'ASC' } });
  }

  async upsertBusinessException(tenantId: string, dto: {
    date: string; isClosed: boolean; openTime?: string; closeTime?: string;
    reason?: string; type?: ExceptionType;
  }): Promise<BusinessException> {
    const existing = await this.beRepo.findOne({ where: { tenantId, date: dto.date } });
    if (existing) { Object.assign(existing, dto); return this.beRepo.save(existing); }
    return this.beRepo.save(this.beRepo.create({ ...dto, tenantId }));
  }

  async deleteBusinessException(tenantId: string, id: string): Promise<void> {
    const exc = await this.beRepo.findOne({ where: { id, tenantId } });
    if (!exc) throw new NotFoundException('Excepción no encontrada');
    await this.beRepo.remove(exc);
  }

  // ─── Plantillas ───────────────────────────────────────────────────────────

  async getTemplates(tenantId: string): Promise<ScheduleTemplate[]> {
    const existing = await this.tplRepo.find({ where: { tenantId }, order: { createdAt: 'ASC' } });
    if (existing.length > 0) return existing;
    const defaults = DEFAULT_TEMPLATES.map(t => this.tplRepo.create({
      tenantId, name: t.name, description: t.description,
      weeklyHours: t.weeklyHours, scheduleData: t.schedule as WeekSchedule,
    }));
    return this.tplRepo.save(defaults);
  }

  async createTemplate(tenantId: string, dto: {
    name: string; description?: string; weeklyHours?: number; scheduleData: WeekSchedule;
  }): Promise<ScheduleTemplate> {
    return this.tplRepo.save(this.tplRepo.create({ ...dto, tenantId }));
  }

  async updateTemplate(tenantId: string, id: string, dto: Partial<{
    name: string; description: string; weeklyHours: number; scheduleData: WeekSchedule;
  }>): Promise<ScheduleTemplate> {
    const tpl = await this.tplRepo.findOne({ where: { id, tenantId } });
    if (!tpl) throw new NotFoundException('Plantilla no encontrada');
    Object.assign(tpl, dto);
    return this.tplRepo.save(tpl);
  }

  async deleteTemplate(tenantId: string, id: string): Promise<void> {
    const tpl = await this.tplRepo.findOne({ where: { id, tenantId } });
    if (!tpl) throw new NotFoundException('Plantilla no encontrada');
    await this.tplRepo.remove(tpl);
  }

  // ─── Horario por empleado ─────────────────────────────────────────────────

  async getEmployeeSchedule(tenantId: string, employeeId: string): Promise<EmployeeSchedule | null> {
    const today = todayDR();
    const schedules = await this.esRepo.find({
      where: { tenantId, employeeId },
      order: { effectiveFrom: 'DESC' },
    });
    return schedules.find(s => s.effectiveFrom <= today && (!s.effectiveTo || s.effectiveTo >= today)) ?? null;
  }

  async getEmployeeScheduleHistory(tenantId: string, employeeId: string): Promise<EmployeeSchedule[]> {
    return this.esRepo.find({
      where: { tenantId, employeeId },
      order: { effectiveFrom: 'DESC' },
    });
  }

  async getAllEmployeeSchedules(tenantId: string, branchId?: string | null): Promise<EmployeeSchedule[]> {
    const where: any = { tenantId };
    if (branchId) where.branchId = branchId;
    return this.esRepo.find({ where, order: { effectiveFrom: 'DESC' } });
  }

  async upsertEmployeeSchedule(tenantId: string, employeeId: string, dto: {
    templateId?: string; effectiveFrom: string; effectiveTo?: string;
    scheduleData: WeekSchedule; weeklyHours?: number; lunchMinutes?: number; notes?: string;
  }): Promise<EmployeeSchedule> {
    let scheduleData = dto.scheduleData;
    if (dto.templateId) {
      const tpl = await this.tplRepo.findOne({ where: { id: dto.templateId, tenantId } });
      if (tpl) scheduleData = tpl.scheduleData;
    }

    // Cerrar el horario vigente anterior con effectiveTo = effectiveFrom - 1 día
    const today = todayDR();
    const current = await this.esRepo.find({ where: { tenantId, employeeId }, order: { effectiveFrom: 'DESC' } });
    const vigente = current.find(s => s.effectiveFrom <= today && (!s.effectiveTo || s.effectiveTo >= today));

    if (vigente && vigente.effectiveFrom !== dto.effectiveFrom) {
      const dayBefore = new Date(dto.effectiveFrom);
      dayBefore.setDate(dayBefore.getDate() - 1);
      vigente.effectiveTo = dayBefore.toISOString().split('T')[0];
      await this.esRepo.save(vigente);
    }

    // Resolver branchId del empleado
    const employeeRecord = await this.empRepo.findOne({ where: { id: employeeId, tenantId } });

    // Crear nuevo registro (siempre, para mantener historial)
    const newSchedule = this.esRepo.create({
      tenantId, employeeId,
      branchId: (employeeRecord as any)?.branchId ?? null,
      templateId: dto.templateId,
      effectiveFrom: dto.effectiveFrom,
      effectiveTo: dto.effectiveTo ?? undefined,
      scheduleData,
      weeklyHours: dto.weeklyHours ?? vigente?.weeklyHours ?? 44,
      lunchMinutes: dto.lunchMinutes ?? vigente?.lunchMinutes ?? 60,
      notes: dto.notes,
    });
    return this.esRepo.save(newSchedule);
  }

  // ─── Excepciones por empleado ─────────────────────────────────────────────

  async getEmployeeExceptions(tenantId: string, employeeId: string): Promise<EmployeeScheduleException[]> {
    return this.eseRepo.find({ where: { tenantId, employeeId }, order: { dateFrom: 'DESC' } });
  }

  async createException(tenantId: string, dto: {
    employeeId: string; employeeName: string;
    dateFrom: string; dateTo: string;
    kind: ExceptionKind; startTime?: string; endTime?: string;
    paid?: boolean; approvedBy?: string; notes?: string;
  }): Promise<EmployeeScheduleException> {
    // paid por defecto según tipo
    const defaultPaid = dto.kind !== ExceptionKind.SUSPENSION;
    return this.eseRepo.save(this.eseRepo.create({ tenantId, ...dto, paid: dto.paid ?? defaultPaid }));
  }

  async deleteException(tenantId: string, id: string): Promise<void> {
    const exc = await this.eseRepo.findOne({ where: { id, tenantId } });
    if (!exc) throw new NotFoundException('Excepción no encontrada');
    await this.eseRepo.remove(exc);
  }

  // ─── Solicitudes de vacaciones ────────────────────────────────────────────

  async createVacationRequest(tenantId: string, dto: {
    employeeId: string; employeeName: string; dateFrom: string; dateTo: string; notes?: string;
  }): Promise<VacationRequest> {
    // Verificar elegibilidad
    const balance = await this.getVacationBalance(tenantId, dto.employeeId);
    if (!balance.canRequest) {
      throw new BadRequestException(
        `No puedes solicitar vacaciones hasta cumplir un año en la empresa (${balance.nextAnniversary})`
      );
    }
    const requested = businessDaysBetween(dto.dateFrom, dto.dateTo);
    if (balance.available < requested) {
      throw new BadRequestException(
        `Solo tienes ${balance.available} días hábiles disponibles y estás solicitando ${requested}`
      );
    }
    const employeeRecord = await this.empRepo.findOne({ where: { id: dto.employeeId, tenantId } });
    return this.vrRepo.save(this.vrRepo.create({
      tenantId,
      branchId: (employeeRecord as any)?.branchId ?? null,
      ...dto,
      status: VacationRequestStatus.PENDING,
    }));
  }

  async getPendingVacationRequests(tenantId: string, branchId?: string | null): Promise<VacationRequest[]> {
    const where: any = { tenantId, status: VacationRequestStatus.PENDING };
    if (branchId) where.branchId = branchId;
    return this.vrRepo.find({ where, order: { createdAt: 'ASC' } });
  }

  async getAllVacationRequests(tenantId: string, branchId?: string | null): Promise<VacationRequest[]> {
    const where: any = { tenantId };
    if (branchId) where.branchId = branchId;
    return this.vrRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  async getMyVacationRequests(tenantId: string, employeeId: string): Promise<VacationRequest[]> {
    return this.vrRepo.find({ where: { tenantId, employeeId }, order: { createdAt: 'DESC' } });
  }

  async reviewVacationRequest(tenantId: string, id: string, dto: {
    status: VacationRequestStatus.APPROVED | VacationRequestStatus.REJECTED;
    reviewedBy: string; reviewNote?: string;
  }): Promise<VacationRequest> {
    const req = await this.vrRepo.findOne({ where: { id, tenantId } });
    if (!req) throw new NotFoundException('Solicitud no encontrada');
    if (req.status !== VacationRequestStatus.PENDING) {
      throw new BadRequestException('Esta solicitud ya fue procesada');
    }

    req.status    = dto.status;
    req.reviewedBy = dto.reviewedBy;
    req.reviewNote = dto.reviewNote ?? null;
    req.reviewedAt = new Date();
    await this.vrRepo.save(req);

    // Si se aprueba, crear la excepción automáticamente
    if (dto.status === VacationRequestStatus.APPROVED) {
      await this.createException(tenantId, {
        employeeId:   req.employeeId,
        employeeName: req.employeeName,
        dateFrom:     req.dateFrom,
        dateTo:       req.dateTo,
        kind:         ExceptionKind.VACATION,
        paid:         true,
        approvedBy:   dto.reviewedBy,
        notes:        req.notes,
      });
    }
    return req;
  }

  // ─── Saldo de vacaciones ──────────────────────────────────────────────────

  async getVacationBalance(tenantId: string, employeeId: string): Promise<{
    entitled: number; used: number; available: number; yearsWorked: number; hireDate: string | null;
    canRequest: boolean; nextAnniversary: string | null;
  }> {
    const emp = await this.empRepo.findOne({ where: { id: employeeId, tenantId } });
    const today = new Date();

    let entitled = 0;
    let yearsWorked = 0;
    let hireDateStr: string | null = null;
    let canRequest = false;
    let nextAnniversary: string | null = null;
    let periodStart: string | null = null;
    let periodEnd: string | null = null;

    if (emp?.hireDate) {
      const hire = new Date(emp.hireDate);
      hireDateStr = hire.toISOString().split('T')[0];
      const msYear = 1000 * 60 * 60 * 24 * 365.25;
      yearsWorked = (today.getTime() - hire.getTime()) / msYear;

      if (yearsWorked < 1) {
        // Aún no cumple el año — no puede solicitar vacaciones
        entitled = 0;
        canRequest = false;
        const next = new Date(hire);
        next.setFullYear(hire.getFullYear() + 1);
        nextAnniversary = next.toISOString().split('T')[0];
      } else {
        canRequest = true;
        // Calcular el aniversario actual (último cumpleaños en la empresa)
        const completedYears = Math.floor(yearsWorked);
        entitled = completedYears >= 5 ? 18 : 14;

        // Período vacacional: desde el último aniversario hasta el próximo
        const lastAnniv = new Date(hire);
        lastAnniv.setFullYear(hire.getFullYear() + completedYears);
        const nextAnniv = new Date(hire);
        nextAnniv.setFullYear(hire.getFullYear() + completedYears + 1);
        periodStart = lastAnniv.toISOString().split('T')[0];
        periodEnd   = nextAnniv.toISOString().split('T')[0];
        nextAnniversary = periodEnd;
      }
    }

    // Días usados: excepciones VACATION dentro del período de aniversario actual
    const vacations = await this.eseRepo.find({ where: { tenantId, employeeId, kind: ExceptionKind.VACATION } });
    const usedInPeriod = periodStart
      ? vacations
          .filter(v => v.dateFrom >= periodStart! && v.dateFrom < periodEnd!)
          .reduce((acc, v) => acc + businessDaysBetween(v.dateFrom, v.dateTo), 0)
      : 0;

    return {
      entitled,
      used: usedInPeriod,
      available: Math.max(0, entitled - usedInPeriod),
      yearsWorked: Math.floor(yearsWorked * 10) / 10,
      hireDate: hireDateStr,
      canRequest,
      nextAnniversary,
    };
  }

  // ─── Vista semanal (calendario admin) ────────────────────────────────────

  async getWeeklyView(tenantId: string, weekStart: string): Promise<any[]> {
    const schedules  = await this.getAllEmployeeSchedules(tenantId);
    const exceptions = await this.eseRepo.find({ where: { tenantId } });
    // Feriados de los dos años más próximos para cubrir el rango visible
    const year = new Date(weekStart).getFullYear();
    await this.getBusinessExceptions(tenantId, year); // auto-preload si faltan
    const holidays = await this.beRepo.find({ where: { tenantId } });
    const holidayDates = new Set(holidays.filter(h => h.isClosed).map(h => h.date));

    // Agrupar por empleado (el vigente tiene la fecha más reciente)
    const byEmp = new Map<string, EmployeeSchedule>();
    for (const s of schedules) {
      if (!byEmp.has(s.employeeId)) byEmp.set(s.employeeId, s);
    }

    return Array.from(byEmp.values()).map(s => {
      const week: Record<string, any> = {};
      for (let i = 0; i < 7; i++) {
        const d = new Date(weekStart + 'T12:00:00');
        d.setDate(d.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        const dayKey  = DAY_KEYS[d.getDay()] as DayKey;
        const daySchedule = s.scheduleData?.[dayKey];
        const exc = exceptions.find(e =>
          e.employeeId === s.employeeId && dateStr >= e.dateFrom && dateStr <= e.dateTo
        );
        const isHoliday = holidayDates.has(dateStr);

        week[dateStr] = exc
          ? { type: exc.kind, paid: exc.paid, note: exc.notes, isHoliday }
          : daySchedule?.isWorking
            ? { type: 'work', blocks: daySchedule.blocks, isHoliday }
            : { type: 'off', isHoliday };
      }
      return { employeeId: s.employeeId, weeklyHours: s.weeklyHours, week };
    });
  }

  // ─── Feriados de una semana (para el header del calendario) ──────────────

  async getHolidaysForWeek(tenantId: string, weekStart: string): Promise<Record<string, string>> {
    const year = new Date(weekStart).getFullYear();
    const weekEnd = new Date(weekStart + 'T12:00:00');
    weekEnd.setDate(weekEnd.getDate() + 6);
    const weekEndStr = weekEnd.toISOString().split('T')[0];

    const holidays = await this.beRepo.find({ where: { tenantId } });
    const result: Record<string, string> = {};
    for (const h of holidays) {
      if (h.isClosed && h.date >= weekStart && h.date <= weekEndStr) {
        result[h.date] = h.reason ?? 'Feriado';
      }
    }
    return result;
  }

  // ─── Verificar horario para caja ─────────────────────────────────────────

  async checkUserSchedule(tenantId: string, employeeId: string): Promise<{
    isWithinSchedule: boolean;
    scheduledStart?: string;
    scheduledEnd?: string;
    message?: string;
    businessClosed?: boolean;
    businessClosedReason?: string;
  }> {
    const now = new Date();
    // Use DR local time for day/hour calculations
    const drNow = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Santo_Domingo', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(now);
    const drHour = drNow.find(p => p.type === 'hour')?.value ?? String(now.getHours()).padStart(2,'0');
    const drMinute = drNow.find(p => p.type === 'minute')?.value ?? String(now.getMinutes()).padStart(2,'0');
    const drWeekdayShort = drNow.find(p => p.type === 'weekday')?.value ?? '';
    const DR_WEEKDAY_MAP: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const drDayNum = DR_WEEKDAY_MAP[drWeekdayShort] ?? now.getDay();
    const dayKey     = DAY_KEYS[drDayNum] as DayKey;
    const currentTime = `${drHour}:${drMinute}`;
    const todayStr   = todayDR();

    // 1. Verificar si el negocio está cerrado hoy
    const bizException = await this.beRepo.findOne({ where: { tenantId, date: todayStr } });
    if (bizException?.isClosed) {
      return {
        isWithinSchedule: false,
        businessClosed: true,
        businessClosedReason: bizException.reason ?? 'El negocio está configurado como cerrado hoy',
        message: `El negocio está cerrado hoy: ${bizException.reason ?? 'cierre especial'}`,
      };
    }
    const bizHour = await this.bhRepo.findOne({ where: { tenantId, dayOfWeek: now.getDay() } });
    if (bizHour && !bizHour.isOpen && !bizHour.is24Hours) {
      return {
        isWithinSchedule: false,
        businessClosed: true,
        businessClosedReason: 'Día no laborable del negocio',
        message: 'Hoy el negocio no abre según el horario configurado',
      };
    }

    // 2. Verificar horario del empleado
    const schedule = await this.getEmployeeSchedule(tenantId, employeeId);
    if (!schedule) return { isWithinSchedule: true }; // sin horario = sin restricción

    const daySchedule = schedule.scheduleData?.[dayKey];
    if (!daySchedule?.isWorking) {
      return { isWithinSchedule: false, message: 'Hoy no es tu día de trabajo según el horario asignado' };
    }

    // Excepciones que impiden trabajar
    const allExc = await this.eseRepo.find({ where: { tenantId, employeeId } });
    const todayExc = allExc.find(e => todayStr >= e.dateFrom && todayStr <= e.dateTo);
    const blockingKinds = [ExceptionKind.DAY_OFF, ExceptionKind.VACATION, ExceptionKind.SICK,
      ExceptionKind.PERMISSION, ExceptionKind.SUSPENSION, ExceptionKind.MATERNITY, ExceptionKind.PATERNITY];
    if (todayExc && blockingKinds.includes(todayExc.kind)) {
      return { isWithinSchedule: false, message: `Tienes registrado: ${todayExc.kind.replace('_', ' ')} para hoy` };
    }

    const firstBlock = daySchedule.blocks[0];
    const lastBlock  = daySchedule.blocks[daySchedule.blocks.length - 1];
    if (firstBlock && currentTime < firstBlock.start) {
      return { isWithinSchedule: false, scheduledStart: firstBlock.start, scheduledEnd: lastBlock?.end, message: `Tu turno empieza a las ${firstBlock.start}` };
    }
    if (lastBlock && currentTime > lastBlock.end) {
      return { isWithinSchedule: false, scheduledStart: firstBlock?.start, scheduledEnd: lastBlock.end, message: `Tu turno terminó a las ${lastBlock.end}` };
    }

    return { isWithinSchedule: true, scheduledStart: firstBlock?.start, scheduledEnd: lastBlock?.end };
  }

  // ─── Horas extras (para nómina) ───────────────────────────────────────────

  async calculateOvertimeForPeriod(tenantId: string, employeeId: string, from: string, to: string): Promise<{
    regularHours: number; overtimeExtra: number; overtimeHoliday: number;
    extraDays: number; holidayWorkDays: number;
  }> {
    const schedule = await this.getEmployeeSchedule(tenantId, employeeId);
    if (!schedule) return { regularHours: 0, overtimeExtra: 0, overtimeHoliday: 0, extraDays: 0, holidayWorkDays: 0 };

    const days  = Math.ceil((new Date(to).getTime() - new Date(from).getTime()) / 86400000) + 1;
    const weeks = days / 7;
    const regularHours = Math.round(schedule.weeklyHours * weeks * 100) / 100;

    // Contar excepciones de trabajo extra en el período
    const exceptions = await this.eseRepo.find({ where: { tenantId, employeeId } });
    const inPeriod   = exceptions.filter(e => e.dateFrom >= from && e.dateTo <= to);

    const extraExceptions    = inPeriod.filter(e => e.kind === ExceptionKind.EXTRA);
    const holidayWorkExcs    = inPeriod.filter(e => e.kind === ExceptionKind.HOLIDAY_WORK);

    const extraDays       = extraExceptions.reduce((acc, e) => acc + businessDaysBetween(e.dateFrom, e.dateTo), 0);
    const holidayWorkDays = holidayWorkExcs.reduce((acc, e) => acc + businessDaysBetween(e.dateFrom, e.dateTo), 0);

    // Horas por día = weeklyHours / días laborables de la semana
    const workDaysPerWeek = Object.values(schedule.scheduleData).filter(d => d.isWorking).length || 5;
    const hoursPerDay     = schedule.weeklyHours / workDaysPerWeek;

    return {
      regularHours,
      overtimeExtra:   Math.round(extraDays    * hoursPerDay * 1.35 * 100) / 100,
      overtimeHoliday: Math.round(holidayWorkDays * hoursPerDay * 2.00 * 100) / 100,
      extraDays,
      holidayWorkDays,
    };
  }

  // ─── Vista del empleado ───────────────────────────────────────────────────

  // Resuelve el ID del empleado: el user.id rara vez coincide con el employee.id
  async resolveEmployeeId(tenantId: string, userId: string, email: string, firstName?: string, lastName?: string): Promise<string> {
    // 1. Si ya hay un schedule con el userId directo
    const byId = await this.esRepo.findOne({ where: { tenantId, employeeId: userId } });
    if (byId) return userId;
    // 2. Buscar employee por email
    if (email) {
      const byEmail = await this.empRepo.findOne({ where: { tenantId, email } });
      if (byEmail) return byEmail.id;
    }
    // 3. Buscar employee por nombre (fallback)
    if (firstName && lastName) {
      const byName = await this.empRepo.findOne({ where: { tenantId, firstName, lastName } });
      if (byName) return byName.id;
    }
    return userId;
  }

  async getEmployeeView(tenantId: string, employeeId: string): Promise<{
    schedule: EmployeeSchedule | null;
    exceptions: EmployeeScheduleException[];
    thisWeek: Record<string, any>;
    nextVacation: EmployeeScheduleException | null;
    vacationBalance: { entitled: number; used: number; available: number; yearsWorked: number };
    pendingRequests: VacationRequest[];
  }> {
    const schedule   = await this.getEmployeeSchedule(tenantId, employeeId);
    const exceptions = await this.getEmployeeExceptions(tenantId, employeeId);
    const balance    = await this.getVacationBalance(tenantId, employeeId);
    const pending    = await this.getMyVacationRequests(tenantId, employeeId);
    const today      = new Date();
    const weekStart  = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay() + 1); // lunes

    const thisWeek: Record<string, any> = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      const dateStr  = d.toISOString().split('T')[0];
      const dayKey   = DAY_KEYS[d.getDay()] as DayKey;
      const daySchedule = schedule?.scheduleData?.[dayKey];
      const exc      = exceptions.find(e => dateStr >= e.dateFrom && dateStr <= e.dateTo);
      const isToday  = dateStr === today.toISOString().split('T')[0];
      const isPast   = d < today && !isToday;

      if (exc) {
        thisWeek[dateStr] = { type: exc.kind, paid: exc.paid };
      } else if (daySchedule?.isWorking) {
        thisWeek[dateStr] = { type: 'work', blocks: daySchedule.blocks, status: isPast ? 'done' : isToday ? 'today' : 'upcoming' };
      } else {
        thisWeek[dateStr] = { type: 'off' };
      }
    }

    const todayStr  = today.toISOString().split('T')[0];
    const nextVacation = exceptions
      .filter(e => e.kind === ExceptionKind.VACATION && e.dateTo >= todayStr)
      .sort((a, b) => a.dateFrom.localeCompare(b.dateFrom))[0] ?? null;

    return { schedule, exceptions, thisWeek, nextVacation, vacationBalance: balance, pendingRequests: pending };
  }
}
