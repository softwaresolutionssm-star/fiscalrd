import {
  Controller, Get, Post, Put, Delete, Patch,
  Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { SchedulesService } from './schedules.service';
import { todayDR } from '../common/utils/date.utils';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums/roles.enum';
import { ExceptionType } from './entities/business-exception.entity';
import { ExceptionKind } from './entities/employee-schedule-exception.entity';
import { VacationRequestStatus } from './entities/vacation-request.entity';
import type { WeekSchedule } from './entities/schedule-template.entity';
import type { BusinessHour } from './entities/business-hour.entity';

interface AuthUser { id: string; tenantId: string; email: string; firstName: string; lastName: string; role: string; branchId: string | null; }

@Controller('schedules')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SchedulesController {
  constructor(private readonly svc: SchedulesService) {}

  // ─── Horario del negocio ────────────────────────────────────────────────

  @Get('business-hours')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getBusinessHours(@CurrentUser() user: AuthUser) {
    return this.svc.getBusinessHours(user.tenantId);
  }

  @Put('business-hours')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  upsertBusinessHours(@CurrentUser() user: AuthUser, @Body() days: Partial<BusinessHour>[]) {
    return this.svc.upsertBusinessHours(user.tenantId, days);
  }

  // ─── Excepciones del negocio ────────────────────────────────────────────

  @Get('business-exceptions')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getBusinessExceptions(@CurrentUser() user: AuthUser, @Query('year') year: string) {
    return this.svc.getBusinessExceptions(user.tenantId, Number(year) || new Date().getFullYear());
  }

  @Post('business-exceptions')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  upsertBusinessException(
    @CurrentUser() user: AuthUser,
    @Body() dto: { date: string; isClosed: boolean; openTime?: string; closeTime?: string; reason?: string; type?: ExceptionType },
  ) {
    return this.svc.upsertBusinessException(user.tenantId, dto);
  }

  @Delete('business-exceptions/:id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  deleteBusinessException(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.svc.deleteBusinessException(user.tenantId, id);
  }

  // ─── Plantillas ─────────────────────────────────────────────────────────

  @Get('templates')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getTemplates(@CurrentUser() user: AuthUser) {
    return this.svc.getTemplates(user.tenantId);
  }

  @Post('templates')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  createTemplate(@CurrentUser() user: AuthUser, @Body() dto: { name: string; description?: string; weeklyHours?: number; scheduleData: WeekSchedule }) {
    return this.svc.createTemplate(user.tenantId, dto);
  }

  @Put('templates/:id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  updateTemplate(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: Partial<{ name: string; description: string; weeklyHours: number; scheduleData: WeekSchedule }>) {
    return this.svc.updateTemplate(user.tenantId, id, dto);
  }

  @Delete('templates/:id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  deleteTemplate(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.svc.deleteTemplate(user.tenantId, id);
  }

  // ─── Horarios por empleado ──────────────────────────────────────────────

  @Get('employees')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getAllEmployeeSchedules(@CurrentUser() user: AuthUser) {
    return this.svc.getAllEmployeeSchedules(user.tenantId, user.branchId);
  }

  @Get('employee/:employeeId')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getEmployeeSchedule(@CurrentUser() user: AuthUser, @Param('employeeId') employeeId: string) {
    return this.svc.getEmployeeSchedule(user.tenantId, employeeId);
  }

  @Get('employee/:employeeId/history')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getEmployeeScheduleHistory(@CurrentUser() user: AuthUser, @Param('employeeId') employeeId: string) {
    return this.svc.getEmployeeScheduleHistory(user.tenantId, employeeId);
  }

  @Put('employee/:employeeId')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  upsertEmployeeSchedule(
    @CurrentUser() user: AuthUser,
    @Param('employeeId') employeeId: string,
    @Body() dto: { templateId?: string; effectiveFrom: string; effectiveTo?: string; scheduleData: WeekSchedule; weeklyHours?: number; lunchMinutes?: number; notes?: string },
  ) {
    return this.svc.upsertEmployeeSchedule(user.tenantId, employeeId, dto);
  }

  // ─── Excepciones por empleado ───────────────────────────────────────────

  @Get('employee/:employeeId/exceptions')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getEmployeeExceptions(@CurrentUser() user: AuthUser, @Param('employeeId') employeeId: string) {
    return this.svc.getEmployeeExceptions(user.tenantId, employeeId);
  }

  @Post('employee/:employeeId/exceptions')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  createException(
    @CurrentUser() user: AuthUser,
    @Param('employeeId') employeeId: string,
    @Body() dto: { employeeName: string; dateFrom: string; dateTo: string; kind: ExceptionKind; startTime?: string; endTime?: string; paid?: boolean; approvedBy?: string; notes?: string },
  ) {
    return this.svc.createException(user.tenantId, { employeeId, ...dto });
  }

  @Delete('exceptions/:id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  deleteException(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.svc.deleteException(user.tenantId, id);
  }

  // ─── Solicitudes de vacaciones ──────────────────────────────────────────

  /** POST /schedules/vacation-requests — empleado solicita vacaciones */
  @Post('vacation-requests')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.CASHIER, UserRole.EMPLOYEE, UserRole.SUPER_ADMIN)
  async createVacationRequest(
    @CurrentUser() user: AuthUser,
    @Body() dto: { employeeId: string; employeeName: string; dateFrom: string; dateTo: string; notes?: string },
  ) {
    // Resolver el ID real del empleado (user.id != employee.id)
    const employeeId = await this.svc.resolveEmployeeId(user.tenantId, user.id, user.email, user.firstName, user.lastName);
    return this.svc.createVacationRequest(user.tenantId, { ...dto, employeeId, employeeName: `${user.firstName} ${user.lastName}` });
  }

  /** GET /schedules/vacation-requests — admin ve todas las solicitudes */
  @Get('vacation-requests')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getAllVacationRequests(@CurrentUser() user: AuthUser) {
    return this.svc.getAllVacationRequests(user.tenantId, user.branchId);
  }

  /** GET /schedules/vacation-requests/pending — solo pendientes */
  @Get('vacation-requests/pending')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getPendingVacationRequests(@CurrentUser() user: AuthUser) {
    return this.svc.getPendingVacationRequests(user.tenantId, user.branchId);
  }

  /** GET /schedules/vacation-requests/mine — empleado ve sus propias */
  @Get('vacation-requests/mine')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.CASHIER, UserRole.EMPLOYEE, UserRole.SUPER_ADMIN)
  async getMyVacationRequests(@CurrentUser() user: AuthUser) {
    const employeeId = await this.svc.resolveEmployeeId(user.tenantId, user.id, user.email, user.firstName, user.lastName);
    return this.svc.getMyVacationRequests(user.tenantId, employeeId);
  }

  /** PATCH /schedules/vacation-requests/:id/review — admin aprueba o rechaza */
  @Patch('vacation-requests/:id/review')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  reviewVacationRequest(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: { status: VacationRequestStatus.APPROVED | VacationRequestStatus.REJECTED; reviewNote?: string },
  ) {
    const reviewedBy = `${user.firstName} ${user.lastName}`;
    return this.svc.reviewVacationRequest(user.tenantId, id, { ...dto, reviewedBy });
  }

  // ─── Saldo de vacaciones ────────────────────────────────────────────────

  @Get('vacation-balance/:employeeId')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getVacationBalance(@CurrentUser() user: AuthUser, @Param('employeeId') employeeId: string) {
    return this.svc.getVacationBalance(user.tenantId, employeeId);
  }

  @Get('vacation-balance-me')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.CASHIER, UserRole.EMPLOYEE, UserRole.SUPER_ADMIN)
  getMyVacationBalance(@CurrentUser() user: AuthUser, @Query('employeeId') employeeId: string) {
    return this.svc.getVacationBalance(user.tenantId, employeeId || user.id);
  }

  // ─── Vista semanal + feriados ───────────────────────────────────────────

  @Get('weekly-view')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getWeeklyView(@CurrentUser() user: AuthUser, @Query('weekStart') weekStart: string) {
    return this.svc.getWeeklyView(user.tenantId, weekStart || todayDR());
  }

  @Get('holidays-for-week')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getHolidaysForWeek(@CurrentUser() user: AuthUser, @Query('weekStart') weekStart: string) {
    return this.svc.getHolidaysForWeek(user.tenantId, weekStart || todayDR());
  }

  // ─── Verificar horario (caja) ───────────────────────────────────────────

  @Get('check/:employeeId')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.CASHIER, UserRole.SUPER_ADMIN)
  checkSchedule(@CurrentUser() user: AuthUser, @Param('employeeId') employeeId: string) {
    return this.svc.checkUserSchedule(user.tenantId, employeeId);
  }

  @Get('check-me')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.CASHIER, UserRole.EMPLOYEE, UserRole.SUPER_ADMIN)
  checkMySchedule(@CurrentUser() user: AuthUser) {
    return this.svc.checkUserSchedule(user.tenantId, user.id);
  }

  // ─── Vista del empleado ─────────────────────────────────────────────────

  @Get('my-schedule')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.CASHIER, UserRole.EMPLOYEE, UserRole.SUPER_ADMIN)
  async getMySchedule(@CurrentUser() user: AuthUser) {
    const employeeId = await this.svc.resolveEmployeeId(user.tenantId, user.id, user.email, user.firstName, user.lastName);
    return this.svc.getEmployeeView(user.tenantId, employeeId);
  }

  @Get('employee-view/:employeeId')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getEmployeeView(@CurrentUser() user: AuthUser, @Param('employeeId') employeeId: string) {
    return this.svc.getEmployeeView(user.tenantId, employeeId);
  }

  // ─── Horas extras ───────────────────────────────────────────────────────

  @Get('overtime/:employeeId')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getOvertime(
    @CurrentUser() user: AuthUser,
    @Param('employeeId') employeeId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.svc.calculateOvertimeForPeriod(user.tenantId, employeeId, from, to);
  }
}
