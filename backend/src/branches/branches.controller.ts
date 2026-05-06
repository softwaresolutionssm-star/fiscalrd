import {
  Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request,
} from '@nestjs/common';
import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/roles.enum';

@Controller('branches')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER, UserRole.ACCOUNTANT)
  findAll(@Request() req: any) {
    return this.branchesService.findAll(req.user.tenantId);
  }

  @Get('stats')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  stats(@Request() req: any) {
    return this.branchesService.getBranchStats(req.user.tenantId);
  }

  @Get('summary')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  summary(@Request() req: any) {
    return this.branchesService.getBranchSummary(req.user.tenantId);
  }

  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER, UserRole.ACCOUNTANT)
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.branchesService.findOne(req.user.tenantId, id);
  }

  @Post()
  @Roles(UserRole.OWNER)
  create(@Request() req: any, @Body() dto: CreateBranchDto) {
    return this.branchesService.create(req.user.tenantId, dto);
  }

  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateBranchDto) {
    return this.branchesService.update(req.user.tenantId, id, dto);
  }

  @Get(':id/deactivation-warnings')
  @Roles(UserRole.OWNER)
  deactivationWarnings(@Request() req: any, @Param('id') id: string) {
    return this.branchesService.getDeactivationWarnings(req.user.tenantId, id);
  }

  @Patch(':id/toggle-active')
  @Roles(UserRole.OWNER)
  toggleActive(@Request() req: any, @Param('id') id: string, @Body() body: { isActive: boolean }) {
    return this.branchesService.toggleActive(req.user.tenantId, id, body.isActive);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER)
  async remove(@Request() req: any, @Param('id') id: string) {
    await this.branchesService.remove(req.user.tenantId, id);
    return { message: 'Sucursal eliminada' };
  }

}
