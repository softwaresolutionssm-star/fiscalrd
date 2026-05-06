import { Controller, Get, Post, Delete, Body, Param, Patch, Query, Res, UseGuards, ParseUUIDPipe, BadRequestException } from '@nestjs/common';
import type { Response } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PayrollService } from './payroll.service';
import { CreatePayrollDto } from './dto/create-payroll.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums/roles.enum';
import { MailService } from '../mail/mail.service';
import { Employee } from '../employees/entities/employee.entity';
import { Tenant } from '../tenants/entities/tenant.entity';

interface AuthUser { id: string; tenantId: string; email: string; firstName: string; lastName: string; role: string; branchId: string | null; }

@Controller('payroll')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PayrollController {
  constructor(
    private readonly payrollService: PayrollService,
    private readonly mailService: MailService,
    @InjectRepository(Employee) private readonly empRepo: Repository<Employee>,
    @InjectRepository(Tenant) private readonly tenantRepo: Repository<Tenant>,
  ) {}

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.ACCOUNTANT)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePayrollDto) {
    return this.payrollService.create(user.tenantId, dto, user.branchId);
  }

  @Post('preview')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.ACCOUNTANT)
  preview(@Body() dto: CreatePayrollDto) {
    return this.payrollService.preview(dto);
  }

  @Get('calculate/regalia-pascual')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.ACCOUNTANT)
  regaliaPascual(
    @CurrentUser() user: AuthUser,
    @Query('employeeId') employeeId: string,
    @Query('year') year: string,
  ) {
    return this.payrollService.calculateRegalíaPascual(user.tenantId, employeeId, parseInt(year) || new Date().getFullYear());
  }

  @Get('calculate/prestaciones')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.ACCOUNTANT)
  prestaciones(
    @CurrentUser() user: AuthUser,
    @Query('employeeId') employeeId: string,
    @Query('yearsOfService') yearsOfService: string,
    @Query('lastSalary') lastSalary: string,
  ) {
    return this.payrollService.calculatePrestaciones(
      user.tenantId, employeeId,
      parseFloat(yearsOfService) || 0,
      parseFloat(lastSalary) || 0,
    );
  }

  // Endpoint para que el empleado/cajero vea su propia nómina
  @Get('my')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.ACCOUNTANT, UserRole.CASHIER, UserRole.EMPLOYEE)
  myPayroll(@CurrentUser() user: AuthUser) {
    return this.payrollService.findMyPayroll(user.tenantId, user.id, user.firstName, user.lastName);
  }

  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.ACCOUNTANT)
  findAll(@CurrentUser() user: AuthUser) {
    return this.payrollService.findAll(user.tenantId, user.branchId);
  }

  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.ACCOUNTANT)
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.payrollService.findOne(id, user.tenantId);
  }

  @Patch(':id/approve')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  approve(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.payrollService.approve(id, user.tenantId);
  }

  @Patch(':id/pay')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  markPaid(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.payrollService.markPaid(id, user.tenantId);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.payrollService.remove(id, user.tenantId);
  }

  @Post(':id/send-email')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.ACCOUNTANT)
  async sendPayslipEmail(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @Body() body: { email?: string },
  ) {
    const payroll = await this.payrollService.findOne(id, user.tenantId);
    const emp = await this.empRepo.findOne({ where: { id: payroll.employeeId, tenantId: user.tenantId } });
    if (!emp) throw new BadRequestException('Empleado no encontrado');

    const recipientEmail = body.email || emp.email;
    if (!recipientEmail) throw new BadRequestException('El empleado no tiene email registrado. Proporciona un email en la solicitud.');

    const tenant = await this.tenantRepo.findOne({ where: { id: user.tenantId } });
    const freqLabel: Record<string, string> = { WEEKLY: 'Semanal', BIWEEKLY: 'Quincenal', MONTHLY: 'Mensual' };
    const periodDisplay = payroll.periodStart && payroll.periodEnd
      ? `${payroll.periodStart} al ${payroll.periodEnd}`
      : payroll.period;

    await this.mailService.sendPayslip(recipientEmail, {
      employeeName: `${emp.firstName} ${emp.lastName}`,
      businessName: tenant?.businessName ?? 'Su empresa',
      period: payroll.period,
      periodDisplay,
      frequency: freqLabel[payroll.frequency] ?? payroll.frequency,
      baseSalary: Number(payroll.baseSalary),
      overtime: Number(payroll.overtime),
      bonuses: Number(payroll.bonuses),
      commission: Number(payroll.commission),
      grossSalary: Number(payroll.grossSalary),
      sfsEmployee: Number(payroll.sfsEmployee),
      afpEmployee: Number(payroll.afpEmployee),
      isr: Number(payroll.isr),
      otherDeductions: Number(payroll.otherDeductions),
      totalDeductions: Number(payroll.totalDeductions),
      netSalary: Number(payroll.netSalary),
      paidAt: payroll.paidAt ?? null,
    });

    return { message: `Recibo enviado a ${recipientEmail}` };
  }

  @Get('export/tss')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async exportTss(
    @CurrentUser() user: AuthUser,
    @Query('period') period: string,
    @Res() res: Response,
  ) {
    const csv = await this.payrollService.exportTssCsv(user.tenantId, period || undefined);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="TSS-${period ?? 'all'}.csv"`);
    res.send(csv);
  }

  @Get('export/ach')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async exportAch(
    @CurrentUser() user: AuthUser,
    @Query('period') period: string,
    @Res() res: Response,
  ) {
    const csv = await this.payrollService.exportAchCsv(user.tenantId, period);
    const filename = `nomina-ach-${period ?? 'todos'}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\uFEFF' + csv); // BOM para Excel
  }
}
