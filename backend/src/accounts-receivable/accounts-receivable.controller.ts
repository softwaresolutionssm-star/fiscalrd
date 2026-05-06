import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { AccountsReceivableService } from './accounts-receivable.service';
import { CreateArDto, RegisterArPaymentDto } from './dto/create-ar.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums/roles.enum';

interface AuthUser { id: string; role: string; tenantId: string; branchId: string | null; }

@Controller('accounts-receivable')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.ACCOUNTANT, UserRole.OWNER, UserRole.CASHIER)
export class AccountsReceivableController {
  constructor(private readonly svc: AccountsReceivableService) {}

  // Owner & Accountant always see all AR consolidated; Admin/Cashier scoped to their branch
  private branchFilter(user: AuthUser): string | null {
    const consolidated = [UserRole.OWNER, UserRole.ACCOUNTANT, UserRole.SUPER_ADMIN];
    return consolidated.includes(user.role as UserRole) ? null : user.branchId;
  }

  @Post() create(@CurrentUser() user: AuthUser, @Body() dto: CreateArDto) { return this.svc.create(user.tenantId, dto, user.branchId); }
  @Get() findAll(@CurrentUser() user: AuthUser) { return this.svc.findAll(user.tenantId, this.branchFilter(user)); }
  @Get('aging') aging(@CurrentUser() user: AuthUser) { return this.svc.aging(user.tenantId, this.branchFilter(user)); }
  @Get('customer/:customerId') customerStatement(@Param('customerId') customerId: string, @CurrentUser() user: AuthUser) { return this.svc.customerStatement(user.tenantId, customerId); }
  @Post(':id/payments') registerPayment(@Param('id') id: string, @CurrentUser() user: AuthUser, @Body() dto: RegisterArPaymentDto) { return this.svc.registerPayment(id, user.tenantId, dto); }
}
