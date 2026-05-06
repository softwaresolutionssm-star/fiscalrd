import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { CashRegisterService } from './cash-register.service';
import { CashEntryType } from './entities/cash-register-expense.entity';
import { OpenSessionDto } from './dto/open-session.dto';
import { CloseSessionDto } from './dto/close-session.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums/roles.enum';

interface AuthUser { id: string; tenantId: string; firstName: string; lastName: string; role: string; branchId: string | null; }

@Controller('cash-register')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.CASHIER, UserRole.SUPER_ADMIN)
export class CashRegisterController {
  constructor(private readonly svc: CashRegisterService) {}

  /** POST /cash-register/open */
  @Post('open')
  open(@CurrentUser() user: AuthUser, @Body() dto: OpenSessionDto) {
    const name = `${user.firstName} ${user.lastName}`;
    return this.svc.open(user.tenantId, user.id, name, dto, user.branchId);
  }

  /** POST /cash-register/close */
  @Post('close')
  close(@CurrentUser() user: AuthUser, @Body() dto: CloseSessionDto) {
    const name = `${user.firstName} ${user.lastName}`;
    return this.svc.close(user.tenantId, user.id, name, dto);
  }

  /** GET /cash-register/current — sesión activa del usuario que llama */
  @Get('current')
  current(@CurrentUser() user: AuthUser) {
    return this.svc.getCurrentOrNull(user.tenantId, user.id);
  }

  /** GET /cash-register/pending-fund — fondo asignado por el admin al usuario actual */
  @Get('pending-fund')
  pendingFund(@CurrentUser() user: AuthUser) {
    return this.svc.getPendingFund(user.id);
  }

  /** GET /cash-register/summary */
  @Get('summary')
  summary(@CurrentUser() user: AuthUser) {
    return this.svc.getSalesSummary(user.tenantId, user.id);
  }

  /** GET /cash-register/history — cajero ve solo las suyas */
  @Get('history')
  history(@CurrentUser() user: AuthUser) {
    return this.svc.getHistory(user.tenantId, user.id, user.role, user.branchId);
  }

  /** POST /cash-register/entry — gasto, retiro o ingreso extra */
  @Post('entry')
  addEntry(
    @CurrentUser() user: AuthUser,
    @Body() dto: { amount: number; description: string; category?: string; type?: CashEntryType },
  ) {
    return this.svc.addEntry(user.tenantId, user.id, dto);
  }

  /** GET /cash-register/entries */
  @Get('entries')
  getEntries(@CurrentUser() user: AuthUser) {
    return this.svc.getEntries(user.tenantId, user.id);
  }

  // Mantener compatibilidad con el endpoint antiguo de gastos
  @Post('expense')
  addExpense(
    @CurrentUser() user: AuthUser,
    @Body() dto: { amount: number; description: string; category?: string },
  ) {
    return this.svc.addEntry(user.tenantId, user.id, { ...dto, type: CashEntryType.EXPENSE });
  }

  @Get('expenses')
  getExpenses(@CurrentUser() user: AuthUser) {
    return this.svc.getEntries(user.tenantId, user.id);
  }
}
