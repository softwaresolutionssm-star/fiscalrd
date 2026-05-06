import {
  Controller, Get, Post, Patch, Put, Delete,
  Param, Body, UseGuards, ParseUUIDPipe,
  HttpCode, HttpStatus,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/roles.enum';
import { AdminCreateTenantDto } from './dto/admin-create-tenant.dto';
import { AdminUpdateTenantDto } from './dto/admin-update-tenant.dto';
import { AdminCreateUserDto } from './dto/admin-create-user.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ─── STATS ─────────────────────────────────────────────────────────────────

  @Get('stats')
  getPlatformStats() {
    return this.adminService.getPlatformStats();
  }

  // ─── TENANTS ───────────────────────────────────────────────────────────────

  @Get('tenants')
  getAllTenants() {
    return this.adminService.getAllTenants();
  }

  @Post('tenants')
  createTenant(@Body() dto: AdminCreateTenantDto) {
    return this.adminService.createTenant(dto);
  }

  @Get('tenants/:id')
  getTenantDetails(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.getTenantDetails(id);
  }

  @Put('tenants/:id')
  updateTenant(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminUpdateTenantDto,
  ) {
    return this.adminService.updateTenant(id, dto);
  }

  @Patch('tenants/:id/toggle')
  toggleTenant(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('isActive') isActive: boolean,
  ) {
    return this.adminService.toggleTenant(id, isActive);
  }

  @Patch('tenants/:id/alanube')
  updateTenantAlanube(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: { alanubeApiKey?: string; alanubeSandbox?: boolean },
  ) {
    return this.adminService.updateTenantAlanube(id, dto);
  }

  @Delete('tenants/:id')
  @HttpCode(HttpStatus.OK)
  deleteTenant(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.deleteTenant(id);
  }

  // ─── TENANT USERS ──────────────────────────────────────────────────────────

  @Get('tenants/:id/users')
  getTenantUsers(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.getTenantUsers(id);
  }

  @Post('tenants/:id/users')
  createTenantUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminCreateUserDto,
  ) {
    return this.adminService.createTenantUser(id, dto);
  }

  // ─── USERS (global) ────────────────────────────────────────────────────────

  @Get('users')
  getAllUsers() {
    return this.adminService.getAllUsers();
  }

  @Get('users/locked')
  getLockedUsers() {
    return this.adminService.getLockedUsers();
  }

  @Patch('users/:id/toggle')
  toggleUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('isActive') isActive: boolean,
  ) {
    return this.adminService.toggleUser(id, isActive);
  }

  @Patch('users/:id/reset-password')
  resetPassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('newPassword') newPassword: string,
  ) {
    return this.adminService.resetUserPassword(id, newPassword);
  }

  @Delete('users/:id')
  @HttpCode(HttpStatus.OK)
  deleteUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.deleteUser(id);
  }

  // ─── BILLING ───────────────────────────────────────────────────────────────

  @Get('billing')
  getBilling() {
    return this.adminService.getBillingOverview();
  }

  @Patch('billing/:id')
  updateBilling(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: { subscriptionStartDate?: string; subscriptionEndDate?: string; subscriptionStatus?: string; plan?: string },
  ) {
    return this.adminService.updateTenantBilling(id, dto);
  }

  // ─── IMPERSONATION ─────────────────────────────────────────────────────────

  @Post('impersonate/:userId')
  impersonateUser(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.adminService.impersonateUser(userId);
  }

  // ─── PER-TENANT METRICS ────────────────────────────────────────────────────

  @Get('metrics/tenants')
  getTenantMetrics() {
    return this.adminService.getTenantMetrics();
  }

  // ─── PLATFORM SETTINGS ─────────────────────────────────────────────────────

  @Get('settings')
  getSettings() {
    return this.adminService.getSettings();
  }

  @Post('settings')
  saveSettings(@Body() body: Record<string, string>) {
    return this.adminService.saveSettings(body);
  }
}
