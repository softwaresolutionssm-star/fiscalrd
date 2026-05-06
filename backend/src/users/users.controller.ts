import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseUUIDPipe, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums/roles.enum';
import { User } from './entities/user.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Employee } from '../employees/entities/employee.entity';
import { PLAN_LIMITS, PLAN_LABELS, TenantPlan } from '../common/enums/plan.enum';

interface AuthUser { id: string; tenantId: string; role: string; firstName: string; lastName: string; branchId: string | null; permissions?: string[] | null; }

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Tenant) private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(Employee) private readonly employeeRepo: Repository<Employee>,
  ) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  async create(@CurrentUser() currentUser: AuthUser, @Body() dto: CreateUserDto) {
    // Super admin no tiene límite de plan
    if (currentUser.role !== UserRole.SUPER_ADMIN && currentUser.tenantId) {
      const tenant = await this.tenantRepo.findOne({ where: { id: currentUser.tenantId } });
      if (tenant) {
        const plan = (tenant.plan as TenantPlan) ?? TenantPlan.FREE;
        const limit = PLAN_LIMITS[plan];
        if (limit.users < 999) {
          const userCount = await this.userRepo.count({ where: { tenantId: currentUser.tenantId } });
          if (userCount >= limit.users) {
            throw new BadRequestException(
              `Límite alcanzado: tu plan ${PLAN_LABELS[plan]} permite ${limit.users} usuarios. Actualiza tu plan para agregar más.`,
            );
          }
        }
      }
    }
    dto.tenantId = currentUser.tenantId;
    // Scoped users (non-owner) auto-stamp their branchId on new users
    if (currentUser.branchId !== null && !(dto as any).branchId) {
      (dto as any).branchId = currentUser.branchId;
    }
    const { cedula, position, baseSalary, ...userDto } = dto;
    const user = await this.usersService.create(userDto as CreateUserDto);

    // Auto-create employee record if employee data was provided
    if (currentUser.tenantId && (cedula || position || baseSalary)) {
      await this.employeeRepo.save(this.employeeRepo.create({
        tenantId: currentUser.tenantId,
        branchId: user.branchId ?? null,
        userId: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        cedula: cedula ?? undefined,
        position: position ?? undefined,
        baseSalary: baseSalary ?? undefined,
      }));
    }

    return user;
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  findAll(@CurrentUser() user: AuthUser) {
    return this.usersService.findAll(user.tenantId ?? undefined, user.branchId, user.id);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.remove(id);
  }

  /** PATCH /users/:id/unlock — Desbloquear cuenta bloqueada por intentos fallidos */
  @Patch(':id/unlock')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  async unlock(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    const target = await this.userRepo.findOne({ where: { id } });
    if (!target) throw new NotFoundException('Usuario no encontrado');

    // Owner/admin can only unlock users of same tenant with lower roles
    if (currentUser.role !== UserRole.SUPER_ADMIN) {
      const allowedRoles = [UserRole.CASHIER, UserRole.EMPLOYEE, UserRole.ACCOUNTANT, UserRole.MANAGER];
      if (target.tenantId !== currentUser.tenantId || !allowedRoles.includes(target.role as UserRole)) {
        throw new NotFoundException('No tienes permiso para desbloquear este usuario');
      }
    }

    target.isLocked = false;
    target.loginAttempts = 0;
    await this.userRepo.save(target);
    return { message: 'Cuenta desbloqueada correctamente' };
  }

  /** PATCH /users/:id/transfer-branch — Owner reasigna el usuario a otra sucursal */
  @Patch(':id/transfer-branch')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async transferBranch(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @Body('branchId') branchId: string | null,
  ) {
    const updatedUser = await this.usersService.transferBranch(id, user.tenantId, branchId ?? null);
    // Sync linked employee's branchId so both stay consistent
    const linkedEmployee = await this.employeeRepo.findOne({ where: { tenantId: user.tenantId, userId: id } });
    if (linkedEmployee) {
      linkedEmployee.branchId = branchId ?? null;
      await this.employeeRepo.save(linkedEmployee);
    }
    return updatedUser;
  }

  /** PATCH /users/:id/permissions — Owner/Admin otorga/revoca permisos extra a un manager */
  @Patch(':id/permissions')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async setPermissions(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: AuthUser,
    @Body('permissions') permissions: string[],
  ) {
    const target = await this.userRepo.findOne({ where: { id } });
    if (!target) throw new NotFoundException('Usuario no encontrado');
    if (target.tenantId !== currentUser.tenantId && currentUser.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Sin permiso');
    }
    const allowed = ['manage_users', 'reset_passwords'];
    target.permissions = Array.isArray(permissions)
      ? permissions.filter(p => allowed.includes(p))
      : null;
    return this.userRepo.save(target);
  }

  /** POST /users/:id/admin-reset-password — Admin/Owner (o manager con permiso) resetea la contraseña */
  @Post(':id/admin-reset-password')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  async adminResetPassword(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: AuthUser,
    @Body('newPassword') newPassword: string,
  ) {
    if (!newPassword || newPassword.length < 6) {
      throw new BadRequestException('La contraseña debe tener al menos 6 caracteres');
    }
    const target = await this.userRepo.findOne({ where: { id } });
    if (!target) throw new NotFoundException('Usuario no encontrado');
    if (target.tenantId !== currentUser.tenantId && currentUser.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Sin permiso');
    }
    // Managers solo pueden si tienen el permiso reset_passwords
    if (currentUser.role === UserRole.MANAGER) {
      const managerUser = await this.userRepo.findOne({ where: { id: currentUser.id } });
      if (!managerUser?.permissions?.includes('reset_passwords')) {
        throw new ForbiddenException('No tienes permiso para restablecer contraseñas');
      }
    }
    // No permitir resetear contraseña de owner ni admin si eres manager
    if (currentUser.role === UserRole.MANAGER && (target.role === UserRole.OWNER || target.role === UserRole.ADMIN)) {
      throw new ForbiddenException('No puedes cambiar la contraseña de un administrador');
    }
    target.password = await bcrypt.hash(newPassword, 10);
    target.isLocked = false;
    target.loginAttempts = 0;
    await this.userRepo.save(target);
    return { message: 'Contraseña actualizada correctamente' };
  }

  /** PATCH /users/:id/assign-fund — Admin/Owner asigna fondo al cajero para su próximo turno */
  @Patch(':id/assign-fund')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN)
  async assignFund(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() admin: AuthUser,
    @Body() body: { amount: number; note?: string },
  ) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    user.pendingCashFund     = body.amount;
    user.pendingCashFundNote = body.note ?? null;
    user.pendingCashFundBy   = `${admin.firstName} ${admin.lastName}`;
    return this.userRepo.save(user);
  }
}
