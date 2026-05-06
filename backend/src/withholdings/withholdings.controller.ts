import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { WithholdingsService } from './withholdings.service';
import { CreateWithholdingDto } from './dto/create-withholding.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ConsolidatedOnlyGuard } from '../common/guards/consolidated-only.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums/roles.enum';

interface AuthUser { id: string; tenantId: string; }

@Controller('withholdings')
@UseGuards(JwtAuthGuard, RolesGuard, ConsolidatedOnlyGuard)
@Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.ACCOUNTANT)
export class WithholdingsController {
  constructor(private readonly svc: WithholdingsService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateWithholdingDto) {
    return this.svc.create(user.tenantId, dto);
  }

  @Get()
  findAll(
    @CurrentUser() user: AuthUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('type') type?: string,
  ) {
    return this.svc.findAll(user.tenantId, { from, to, type });
  }

  @Get('report')
  monthlyReport(
    @CurrentUser() user: AuthUser,
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    const now = new Date();
    return this.svc.monthlyReport(
      user.tenantId,
      year ? parseInt(year) : now.getFullYear(),
      month ? parseInt(month) : now.getMonth() + 1,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.svc.remove(id, user.tenantId);
  }
}
