import { Controller, Get, Post, Delete, Query, Param, Body, UseGuards, Res } from '@nestjs/common';
import type { Response } from 'express';
import { DgiiReportsService } from './dgii-reports.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ConsolidatedOnlyGuard } from '../common/guards/consolidated-only.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums/roles.enum';

interface AuthUser { id: string; tenantId: string; role: string; firstName?: string; lastName?: string; }

@Controller('dgii-reports')
@UseGuards(JwtAuthGuard, RolesGuard, ConsolidatedOnlyGuard)
@Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.ACCOUNTANT)
export class DgiiReportsController {
  constructor(private readonly dgiiReportsService: DgiiReportsService) {}

  @Get('607')
  report607(
    @CurrentUser() user: AuthUser,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    const now = new Date();
    return this.dgiiReportsService.report607(
      user.tenantId,
      parseInt(year) || now.getFullYear(),
      parseInt(month) || now.getMonth() + 1,
    );
  }

  @Get('608')
  report608(
    @CurrentUser() user: AuthUser,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    const now = new Date();
    return this.dgiiReportsService.report608(
      user.tenantId,
      parseInt(year) || now.getFullYear(),
      parseInt(month) || now.getMonth() + 1,
    );
  }

  @Get('606')
  report606(
    @CurrentUser() user: AuthUser,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    const now = new Date();
    return this.dgiiReportsService.report606(
      user.tenantId,
      parseInt(year) || now.getFullYear(),
      parseInt(month) || now.getMonth() + 1,
    );
  }

  @Get('623')
  report623(
    @CurrentUser() user: AuthUser,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    const now = new Date();
    return this.dgiiReportsService.report623(
      user.tenantId,
      parseInt(year) || now.getFullYear(),
      parseInt(month) || now.getMonth() + 1,
    );
  }

  @Get('validate-rnc/:rnc')
  validateRnc(@Param('rnc') rnc: string) {
    return this.dgiiReportsService.validateRnc(rnc);
  }

  @Get('it1')
  it1Declaration(
    @CurrentUser() user: AuthUser,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    const now = new Date();
    return this.dgiiReportsService.it1Declaration(
      user.tenantId,
      parseInt(year) || now.getFullYear(),
      parseInt(month) || now.getMonth() + 1,
    );
  }

  @Get('summary')
  summary(
    @CurrentUser() user: AuthUser,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    const now = new Date();
    return this.dgiiReportsService.summary(
      user.tenantId,
      parseInt(year) || now.getFullYear(),
      parseInt(month) || now.getMonth() + 1,
    );
  }

  @Get('607/download')
  async download607(
    @CurrentUser() user: AuthUser,
    @Query('year') year: string,
    @Query('month') month: string,
    @Res() res: Response,
  ) {
    const now = new Date();
    const y = parseInt(year) || now.getFullYear();
    const m = parseInt(month) || now.getMonth() + 1;
    const period = `${y}-${String(m).padStart(2, '0')}`;
    const content = await this.dgiiReportsService.generate607Txt(user.tenantId, y, m);
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="607_${period}.txt"`);
    res.send(content);
  }

  @Get('608/download')
  async download608(
    @CurrentUser() user: AuthUser,
    @Query('year') year: string,
    @Query('month') month: string,
    @Res() res: Response,
  ) {
    const now = new Date();
    const y = parseInt(year) || now.getFullYear();
    const m = parseInt(month) || now.getMonth() + 1;
    const period = `${y}-${String(m).padStart(2, '0')}`;
    const content = await this.dgiiReportsService.generate608Txt(user.tenantId, y, m);
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="608_${period}.txt"`);
    res.send(content);
  }

  @Post('submissions')
  markSubmitted(
    @CurrentUser() user: AuthUser,
    @Body('reportType') reportType: string,
    @Body('period') period: string,
    @Body('notes') notes?: string,
  ) {
    return this.dgiiReportsService.markSubmitted(
      user.tenantId, reportType, period,
      `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.id,
      notes,
    );
  }

  @Get('submissions')
  getSubmissions(
    @CurrentUser() user: AuthUser,
    @Query('year') year?: string,
  ) {
    return this.dgiiReportsService.getSubmissions(user.tenantId, year ? parseInt(year) : undefined);
  }

  @Delete('submissions/:id')
  deleteSubmission(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.dgiiReportsService.deleteSubmission(user.tenantId, id);
  }

  @Get('623/download')
  async download623(
    @CurrentUser() user: AuthUser,
    @Query('year') year: string,
    @Query('month') month: string,
    @Res() res: Response,
  ) {
    const now = new Date();
    const y = parseInt(year) || now.getFullYear();
    const m = parseInt(month) || now.getMonth() + 1;
    const period = `${y}-${String(m).padStart(2, '0')}`;
    const content = await this.dgiiReportsService.generate623Txt(user.tenantId, y, m);
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="623_${period}.txt"`);
    res.send(content);
  }

  @Get('it1/annual')
  it1Annual(
    @CurrentUser() user: AuthUser,
    @Query('year') year: string,
  ) {
    const now = new Date();
    return this.dgiiReportsService.it1Annual(user.tenantId, parseInt(year) || now.getFullYear());
  }

  @Get('606/download')
  async download606(
    @CurrentUser() user: AuthUser,
    @Query('year') year: string,
    @Query('month') month: string,
    @Res() res: Response,
  ) {
    const now = new Date();
    const y = parseInt(year) || now.getFullYear();
    const m = parseInt(month) || now.getMonth() + 1;
    const period = `${y}-${String(m).padStart(2, '0')}`;
    const content = await this.dgiiReportsService.generate606Txt(user.tenantId, y, m);
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="606_${period}.txt"`);
    res.send(content);
  }
}
