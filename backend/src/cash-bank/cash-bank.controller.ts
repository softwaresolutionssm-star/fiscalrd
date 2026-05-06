import { Controller, Get, Post, Patch, Body, Query, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { CashBankService } from './cash-bank.service';
import { todayDR } from '../common/utils/date.utils';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums/roles.enum';

interface AuthUser { id: string; tenantId: string; branchId: string | null; }

@Controller('cash-bank')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.ACCOUNTANT)
export class CashBankController {
  constructor(private readonly svc: CashBankService) {}

  @Post() create(@CurrentUser() user: AuthUser, @Body() dto: CreateTransactionDto) { return this.svc.create(user.tenantId, dto, user.branchId); }
  @Get() findAll(@CurrentUser() user: AuthUser) { return this.svc.findAll(user.tenantId, user.branchId); }
  @Get('balance') balance(@CurrentUser() user: AuthUser) { return this.svc.balance(user.tenantId, user.branchId); }
  @Get('daily-summary') dailySummary(@CurrentUser() user: AuthUser, @Query('date') date: string) {
    return this.svc.dailySummary(user.tenantId, date || todayDR(), user.branchId);
  }

  // ─── Conciliación bancaria ─────────────────────────────────────────────────
  @Get('reconciliation')
  getReconciliation(@CurrentUser() user: AuthUser) {
    return this.svc.getReconciliationSummary(user.tenantId);
  }

  @Post('reconciliation')
  reconcile(
    @CurrentUser() user: AuthUser,
    @Body() dto: { transactionIds: string[]; statementBalance: number; statementRef?: string },
  ) {
    return this.svc.reconcileTransactions(user.tenantId, dto);
  }

  @Patch('reconciliation/:id/unreconcile')
  unreconcile(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.unreconcileTransaction(user.tenantId, id);
  }
}
