import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { StatsService } from './stats.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

interface AuthUser { id: string; tenantId: string; branchId: string | null; }

@Controller('stats')
@UseGuards(JwtAuthGuard)
export class StatsController {
  constructor(private readonly svc: StatsService) {}

  @Get('dashboard')
  dashboard(
    @CurrentUser() user: AuthUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('branchId') branchIdOverride?: string,
  ) {
    const branchId = user.branchId ?? (branchIdOverride || null);
    return this.svc.getDashboardStats(user.tenantId, branchId, from, to);
  }

  @Get('daily')
  daily(
    @CurrentUser() user: AuthUser,
    @Query('days') days?: string,
    @Query('branchId') branchIdOverride?: string,
  ) {
    const branchId = user.branchId ?? (branchIdOverride || null);
    return this.svc.getDailyStats(user.tenantId, branchId, days ? parseInt(days) : 7);
  }

  @Get('top-products')
  topProducts(
    @CurrentUser() user: AuthUser,
    @Query('limit') limit?: string,
    @Query('branchId') branchIdOverride?: string,
  ) {
    const branchId = user.branchId ?? (branchIdOverride || null);
    return this.svc.getTopProducts(user.tenantId, branchId, limit ? parseInt(limit) : 5);
  }

  @Get('report607')
  report607(@CurrentUser() user: AuthUser, @Query('year') year?: string, @Query('month') month?: string) {
    const now = new Date();
    return this.svc.report607Data(
      user.tenantId,
      year  ? parseInt(year)  : now.getFullYear(),
      month ? parseInt(month) : now.getMonth() + 1,
    );
  }
}
