import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto, PublicBookAppointmentDto } from './dto/create-appointment.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums/roles.enum';
import { AppointmentStatus } from './entities/appointment.entity';

interface AuthUser { id: string; role: string; tenantId: string; branchId: string | null; }

// ─── PUBLIC endpoints (no auth) ──────────────────────────────────────────────
@Controller('appointments/public')
export class AppointmentsPublicController {
  constructor(private readonly svc: AppointmentsService) {}

  @Post('book')
  publicBook(@Body() dto: PublicBookAppointmentDto) {
    return this.svc.publicBook(dto);
  }

  @Get('slots')
  slots(@Query('tenantId') tenantId: string, @Query('date') date: string, @Query('employeeId') employeeId?: string) {
    return this.svc.checkAvailability(tenantId, date, employeeId);
  }

  @Patch('cancel/:token')
  cancelByToken(@Param('token') token: string) {
    return this.svc.cancelByToken(token);
  }
}

// ─── PROTECTED endpoints ──────────────────────────────────────────────────────
@Controller('appointments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.CASHIER, UserRole.ACCOUNTANT)
export class AppointmentsController {
  constructor(private readonly svc: AppointmentsService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateAppointmentDto) {
    return this.svc.create(user.tenantId, dto, user.branchId);
  }

  @Get()
  findAll(
    @CurrentUser() user: AuthUser,
    @Query('date') date?: string,
    @Query('employeeId') employeeId?: string,
  ) {
    return this.svc.findAll(user.tenantId, user.branchId, date, employeeId);
  }

  @Get('availability')
  availability(
    @CurrentUser() user: AuthUser,
    @Query('date') date: string,
    @Query('employeeId') employeeId?: string,
  ) {
    return this.svc.checkAvailability(user.tenantId, date, employeeId, user.branchId);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() body: { status: AppointmentStatus; cancelReason?: string },
  ) {
    return this.svc.updateStatus(id, user.tenantId, body.status, body.cancelReason);
  }

  @Patch(':id')
  update(@Param('id') id: string, @CurrentUser() user: AuthUser, @Body() dto: Partial<CreateAppointmentDto>) {
    return this.svc.update(id, user.tenantId, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.svc.remove(id, user.tenantId);
  }
}
