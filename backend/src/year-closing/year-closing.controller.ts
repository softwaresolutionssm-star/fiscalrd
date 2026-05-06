import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { YearClosingService } from './year-closing.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ConsolidatedOnlyGuard } from '../common/guards/consolidated-only.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums/roles.enum';

interface AuthUser { id: string; tenantId: string; firstName: string; lastName: string; role: string; branchId: string | null; }

// El cierre de año es un proceso contable a nivel de empresa (tenantId).
// Solo OWNER, ACCOUNTANT y SUPER_ADMIN pueden ver y operar.
// El ADMIN de sucursal no tiene acceso — no puede ver solo una parte del negocio.

@Controller('year-closing')
@UseGuards(JwtAuthGuard, RolesGuard, ConsolidatedOnlyGuard)
@Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.SUPER_ADMIN)
export class YearClosingController {
  constructor(private readonly svc: YearClosingService) {}

  /** GET /year-closing — listado de cierres consolidados */
  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.svc.findAll(user.tenantId);
  }

  /**
   * GET /year-closing/preview?year=2025&branchId=...
   * Preview INFORMATIVO — puede filtrarse por sucursal para análisis.
   * NO es el cierre oficial.
   */
  @Get('preview')
  preview(
    @CurrentUser() user: AuthUser,
    @Query('year') year: string,
    @Query('branchId') branchId?: string,
  ) {
    // branchId es opcional — si no se pasa, el preview es consolidado
    return this.svc.preview(user.tenantId, Number(year) || new Date().getFullYear() - 1, branchId || null);
  }

  /**
   * GET /year-closing/validate?year=2025
   * Chequeos pre-cierre: borradores, nóminas, CxC, cierre existente.
   */
  @Get('validate')
  validate(
    @CurrentUser() user: AuthUser,
    @Query('year') year: string,
  ) {
    return this.svc.validate(user.tenantId, Number(year) || new Date().getFullYear() - 1);
  }

  /**
   * POST /year-closing — cierre OFICIAL siempre consolidado.
   * Solo OWNER y SUPER_ADMIN pueden crear el cierre.
   */
  @Post()
  @Roles(UserRole.OWNER, UserRole.SUPER_ADMIN)
  close(
    @CurrentUser() user: AuthUser,
    @Body() dto: { year: number; notes?: string },
  ) {
    return this.svc.close(user.tenantId, {
      year: dto.year,
      notes: dto.notes,
      closedBy: `${user.firstName} ${user.lastName}`,
    });
  }
}
