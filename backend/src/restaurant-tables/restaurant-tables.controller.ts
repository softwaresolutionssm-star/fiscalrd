import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { RestaurantTablesService } from './restaurant-tables.service';
import { todayDR } from '../common/utils/date.utils';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums/roles.enum';

interface AuthUser { id: string; role: string; tenantId: string; branchId: string | null; }

@Controller('restaurant-tables')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.CASHIER)
export class RestaurantTablesController {
  constructor(private readonly svc: RestaurantTablesService) {}

  // ─── Tables ──────────────────────────────────────────────────────────────────
  @Post('tables') createTable(@CurrentUser() u: AuthUser, @Body() dto: any) { return this.svc.createTable(u.tenantId, dto, u.branchId); }
  @Get('tables') findTables(@CurrentUser() u: AuthUser) { return this.svc.findTables(u.tenantId, u.branchId); }
  @Patch('tables/:id') updateTable(@Param('id') id: string, @CurrentUser() u: AuthUser, @Body() dto: any) { return this.svc.updateTable(id, u.tenantId, dto); }
  @Delete('tables/:id') @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN) removeTable(@Param('id') id: string, @CurrentUser() u: AuthUser) { return this.svc.removeTable(id, u.tenantId); }

  // ─── Orders ──────────────────────────────────────────────────────────────────
  @Post('orders/open') openOrder(@CurrentUser() u: AuthUser, @Body() body: { tableId: string; serverName?: string; guestCount?: number; notes?: string }) {
    return this.svc.openOrder(u.tenantId, body.tableId, body, u.branchId);
  }

  @Get('orders/:id') getOrder(@Param('id') id: string, @CurrentUser() u: AuthUser) { return this.svc.getOrder(id, u.tenantId); }

  @Post('orders/:id/items') addItem(@Param('id') id: string, @CurrentUser() u: AuthUser, @Body() item: any) { return this.svc.addItem(id, u.tenantId, item); }
  @Delete('orders/:id/items/:index') removeItem(@Param('id') id: string, @Param('index') idx: string, @CurrentUser() u: AuthUser) { return this.svc.removeItem(id, u.tenantId, parseInt(idx)); }
  @Patch('orders/:id/tip') setTip(@Param('id') id: string, @CurrentUser() u: AuthUser, @Body() body: { tipAmount: number }) { return this.svc.setTip(id, u.tenantId, body.tipAmount); }
  @Post('orders/:id/close') closeOrder(@Param('id') id: string, @CurrentUser() u: AuthUser, @Body() dto: any) { return this.svc.closeOrder(id, u.tenantId, dto); }
  @Post('orders/:id/cancel') cancelOrder(@Param('id') id: string, @CurrentUser() u: AuthUser) { return this.svc.cancelOrder(id, u.tenantId); }

  @Get('history') history(@CurrentUser() u: AuthUser) { return this.svc.getOrderHistory(u.tenantId, u.branchId); }
  @Get('summary') summary(@CurrentUser() u: AuthUser, @Query('date') date: string) {
    return this.svc.getDailySummary(u.tenantId, date ?? todayDR(), u.branchId);
  }
}
