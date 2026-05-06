import { Controller, Get, Post, Body, Param, UseGuards, ParseUUIDPipe, Patch } from '@nestjs/common';
import { SalesService, ReturnItemDto } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

interface AuthUser { id: string; tenantId: string; role: string; branchId: string | null; }

@Controller('sales')
@UseGuards(JwtAuthGuard)
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateSaleDto) {
    return this.salesService.create(user.tenantId, dto, user.branchId);
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.salesService.findAll(user.tenantId, user.branchId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.salesService.findOne(id, user.tenantId);
  }

  @Patch(':id/issue')
  issue(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.salesService.issue(id, user.tenantId, user.id);
  }

  @Patch(':id/cancel')
  cancel(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.salesService.cancel(id, user.tenantId);
  }

  @Post(':id/send-email')
  sendEmail(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @Body('customerEmail') customerEmail: string,
  ) {
    return this.salesService.sendInvoiceEmail(id, user.tenantId, customerEmail);
  }

  @Post(':id/retry-alanube')
  retryAlanube(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.salesService.retryAlanube(id, user.tenantId);
  }

  @Post(':id/sync-dgii')
  syncDgiiStatus(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.salesService.syncDgiiStatus(id, user.tenantId);
  }

  @Post(':id/return')
  createReturn(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @Body() body: { items: ReturnItemDto[]; notes?: string },
  ) {
    return this.salesService.createReturn(id, user.tenantId, body.items, body.notes);
  }

  @Post('sync-offline')
  syncOffline(
    @CurrentUser() user: AuthUser,
    @Body() body: { sales: any[] },
  ) {
    return this.salesService.syncOfflineSales(user.tenantId, user.id, body.sales ?? []);
  }
}
