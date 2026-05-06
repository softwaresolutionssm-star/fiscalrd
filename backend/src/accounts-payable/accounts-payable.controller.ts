import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { AccountsPayableService } from './accounts-payable.service';
import { CreateApDto, RegisterApPaymentDto } from './dto/create-ap.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums/roles.enum';

interface AuthUser { id: string; role: string; tenantId: string; branchId: string | null; }

@Controller('accounts-payable')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.ACCOUNTANT)
export class AccountsPayableController {
  constructor(private readonly svc: AccountsPayableService) {}

  // Owner & Accountant always see all AP consolidated; Admin/Cashier scoped to their branch
  private branchFilter(user: AuthUser): string | null {
    const consolidated = [UserRole.OWNER, UserRole.ACCOUNTANT, UserRole.SUPER_ADMIN];
    return consolidated.includes(user.role as UserRole) ? null : user.branchId;
  }

  @Post() create(@CurrentUser() user: AuthUser, @Body() dto: CreateApDto) { return this.svc.create(user.tenantId, dto, user.branchId); }
  @Get() findAll(@CurrentUser() user: AuthUser) { return this.svc.findAll(user.tenantId, this.branchFilter(user)); }
  @Get('aging') aging(@CurrentUser() user: AuthUser) { return this.svc.aging(user.tenantId, this.branchFilter(user)); }
  @Get('supplier/:supplierId') supplierStatement(@Param('supplierId') supplierId: string, @CurrentUser() user: AuthUser) { return this.svc.supplierStatement(user.tenantId, supplierId); }
  @Post(':id/payments') registerPayment(@Param('id') id: string, @CurrentUser() user: AuthUser, @Body() dto: RegisterApPaymentDto) { return this.svc.registerPayment(id, user.tenantId, dto); }
}
