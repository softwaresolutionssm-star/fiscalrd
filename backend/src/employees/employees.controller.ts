import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseUUIDPipe, Query } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums/roles.enum';

interface AuthUser { id: string; tenantId: string; email: string; firstName: string; lastName: string; role: string; branchId: string | null; }

@Controller('employees')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateEmployeeDto) {
    return this.employeesService.create(user.tenantId, user.branchId, dto);
  }

  @Get('me')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.ACCOUNTANT, UserRole.CASHIER, UserRole.EMPLOYEE)
  getMe(@CurrentUser() user: AuthUser) {
    return this.employeesService.findByUser(user.tenantId, user.email, user.firstName, user.lastName);
  }

  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.ACCOUNTANT)
  findAll(@CurrentUser() user: AuthUser) {
    return this.employeesService.findAll(user.tenantId, user.branchId);
  }

  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.ACCOUNTANT)
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.employeesService.findOne(id, user.tenantId);
  }

  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  update(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser, @Body() dto: UpdateEmployeeDto) {
    return this.employeesService.update(id, user.tenantId, dto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.employeesService.remove(id, user.tenantId);
  }

  @Patch(':id/transfer-branch')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  transferBranch(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @Body('branchId') branchId: string | null,
    @Body('notes') notes?: string,
  ) {
    const actor = { id: user.id, name: `${user.firstName} ${user.lastName}` };
    return this.employeesService.transferBranch(id, user.tenantId, branchId ?? null, actor, notes);
  }

  @Get(':id/branch-history')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.ACCOUNTANT)
  getBranchHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.employeesService.getBranchHistory(id, user.tenantId);
  }
}
