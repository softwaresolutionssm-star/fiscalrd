import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  HttpCode, HttpStatus,
  Logger,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { CreateMovementDto } from './dto/create-movement.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums/roles.enum';

interface AuthUser { id: string; tenantId: string; role: string; branchId: string | null; }

@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.ACCOUNTANT, UserRole.OWNER, UserRole.CASHIER, UserRole.MANAGER)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('movements')
  createMovement(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateMovementDto,
  ) {
    return this.inventoryService.createMovement(user.tenantId, dto, user.branchId);
  }

  @Get('movements')
  getMovements(
    @CurrentUser() user: AuthUser,
    @Query('productId') productId?: string,
    @Query('branchId') branchIdOverride?: string,
  ) {
    // branchId en JWT tiene prioridad (usuarios con sucursal asignada)
    // El owner (branchId=null en JWT) puede filtrar via query param
    const branchId = user.branchId ?? (branchIdOverride || null);
    return this.inventoryService.getMovements(user.tenantId, branchId, productId);
  }

  @Get('stock')
  getStockLevels(
    @CurrentUser() user: AuthUser,
    @Query('branchId') branchIdOverride?: string,
  ) {
    const branchId = user.branchId ?? (branchIdOverride || null);
    return this.inventoryService.getStockLevels(user.tenantId, branchId);
  }

  @Get('alerts')
  getAlerts(
    @CurrentUser() user: AuthUser,
    @Query('branchId') branchIdOverride?: string,
  ) {
    const branchId = user.branchId ?? (branchIdOverride || null);
    return this.inventoryService.getAlerts(user.tenantId, branchId);
  }

  @Get('low-stock')
  lowStock(
    @CurrentUser() user: AuthUser,
    @Query('branchId') branchIdOverride?: string,
  ) {
    const branchId = user.branchId ?? (branchIdOverride || null);
    return this.inventoryService.getLowStock(user.tenantId, branchId);
  }

  @Post('send-low-stock-alert')
  @HttpCode(HttpStatus.OK)
  sendLowStockAlert(@CurrentUser() user: AuthUser) {
    return this.inventoryService.sendLowStockEmail(user.tenantId);
  }

  /** Repara movimientos faltantes de compras confirmadas + devuelve diagnóstico */
  @Post('repair')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  repair(@CurrentUser() user: AuthUser) {
    return this.inventoryService.repairAndDiagnose(user.tenantId, user.branchId);
  }

  @Post('transfer')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async transfer(
    @CurrentUser() user: AuthUser,
    @Body() body: {
      fromBranchId: string;
      toBranchId: string;
      productId: string;
      productName: string;
      quantity: number;
      notes?: string;
    },
  ) {
    return this.inventoryService.transferBetweenBranches(user.tenantId, body);
  }

  @Get('transfers')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.ACCOUNTANT)
  getTransferHistory(@CurrentUser() user: AuthUser) {
    return this.inventoryService.getTransferHistory(user.tenantId, user.branchId);
  }
}
