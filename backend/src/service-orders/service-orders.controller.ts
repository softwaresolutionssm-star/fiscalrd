import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ServiceOrdersService } from './service-orders.service';
import { CreateServiceOrderDto, UpdateServiceOrderDto } from './dto/create-service-order.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums/roles.enum';

interface AuthUser { id: string; role: string; tenantId: string; branchId: string | null; }

@Controller('service-orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.CASHIER, UserRole.ACCOUNTANT)
export class ServiceOrdersController {
  constructor(private readonly svc: ServiceOrdersService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateServiceOrderDto) {
    return this.svc.create(user.tenantId, dto, user.branchId);
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.svc.findAll(user.tenantId, user.branchId);
  }

  @Get('stats')
  stats(@CurrentUser() user: AuthUser) {
    return this.svc.stats(user.tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.svc.findOne(id, user.tenantId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @CurrentUser() user: AuthUser, @Body() dto: UpdateServiceOrderDto) {
    return this.svc.update(id, user.tenantId, dto);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.svc.remove(id, user.tenantId);
  }
}
