import {
  Injectable,
  NotFoundException,
  ConflictException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { Tenant } from '../tenants/entities/tenant.entity';
import { User } from '../users/entities/user.entity';
import { Sale } from '../sales/entities/sale.entity';
import { NcfSequence } from '../ncf-sequences/entities/ncf-sequence.entity';
import { PlatformSetting } from './entities/platform-setting.entity';
import { Branch } from '../branches/entities/branch.entity';
import { UserRole } from '../common/enums/roles.enum';
import { DEFAULT_ECF_TYPES } from '../common/enums/ncf-type.enum';
import { TenantPlan } from '../common/enums/plan.enum';
import { BusinessType } from '../common/enums/business-type.enum';
import { AdminCreateTenantDto } from './dto/admin-create-tenant.dto';
import { AdminUpdateTenantDto } from './dto/admin-update-tenant.dto';
import { AdminCreateUserDto } from './dto/admin-create-user.dto';
import { MailService } from '../mail/mail.service';

const DEFAULT_SETTINGS: Record<string, string> = {
  platform_name:           'FiscalRD',
  platform_url:            'https://fiscalrd.do',
  support_email:           'softwaresolutionssm@gmail.com',
  admin_email:             'softwaresolutionssm@gmail.com',
  open_registration:       'false',
  require_approval:        'true',
  alanube_sandbox:         'true',
  alanube_api_key_global:  '',
  payment_bank_name:       'Banreservas',
  payment_account_number:  '9607453361',
  payment_account_name:    'Saul Mercado',
  payment_account_type:    'Corriente',
  payment_instructions:    'Realiza la transferencia a la cuenta indicada y sube el comprobante desde tu panel de Facturación. Tu pago será revisado en menos de 24 horas.',
  plan_price_basic:        '2500',
  plan_price_pro:          '4500',
  plan_price_enterprise:   '5500',
};

@Injectable()
export class AdminService implements OnModuleInit {
  constructor(
    @InjectRepository(Tenant) private tenantRepo: Repository<Tenant>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Sale) private saleRepo: Repository<Sale>,
    @InjectRepository(NcfSequence) private ncfSequenceRepo: Repository<NcfSequence>,
    @InjectRepository(PlatformSetting) private settingRepo: Repository<PlatformSetting>,
    @InjectRepository(Branch) private branchRepo: Repository<Branch>,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  // Sembrar settings por defecto si no existen en BD
  async onModuleInit() {
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      const existing = await this.settingRepo.findOne({ where: { key } });
      if (!existing) {
        await this.settingRepo.save({ key, value });
      }
    }

  }

  // ─── STATS ─────────────────────────────────────────────────────────────────

  async getPlatformStats() {
    const [totalTenants, activeTenants, totalUsers, totalSales] = await Promise.all([
      this.tenantRepo.count(),
      this.tenantRepo.count({ where: { isActive: true } }),
      this.userRepo.count(),
      this.saleRepo.count(),
    ]);

    // Revenue estimate (plan prices)
    const tenants = await this.tenantRepo.find({ select: ['plan'] });
    const planPrices: Record<string, number> = { free: 0, basic: 19.99, pro: 49.99, enterprise: 99.99 };
    const mrr = tenants.reduce((acc, t) => acc + (planPrices[t.plan] ?? 0), 0);

    return { totalTenants, activeTenants, totalUsers, totalSales, mrr };
  }

  // ─── TENANTS ───────────────────────────────────────────────────────────────

  async getAllTenants() {
    const tenants = await this.tenantRepo.find({ order: { createdAt: 'DESC' } });
    const result: any[] = [];
    for (const t of tenants) {
      const [userCount, saleCount] = await Promise.all([
        this.userRepo.count({ where: { tenantId: t.id } }),
        this.saleRepo.count({ where: { tenantId: t.id } }),
      ]);
      result.push({ ...t, userCount, saleCount });
    }
    return result;
  }

  async createTenant(dto: AdminCreateTenantDto) {
    const existingRnc = await this.tenantRepo.findOne({ where: { rnc: dto.rnc } });
    if (existingRnc) throw new ConflictException('Ya existe un negocio con ese RNC');

    const existingEmail = await this.userRepo.findOne({ where: { email: dto.ownerEmail } });
    if (existingEmail) throw new ConflictException('Ya existe un usuario con ese email');

    const tenant = this.tenantRepo.create({
      businessName: dto.businessName,
      rnc: dto.rnc,
      email: dto.businessEmail,
      phone: dto.phone,
      address: dto.address,
      isActive: true,
      plan: (dto.plan as TenantPlan) ?? TenantPlan.FREE,
      businessType: (dto.businessType as BusinessType) ?? BusinessType.OTRO,
      alanubeSandbox: true,
      maxBranches: dto.maxBranches ?? 1,
    });
    await this.tenantRepo.save(tenant);

    const hashedPassword = await bcrypt.hash(dto.ownerPassword, 10);
    const owner = this.userRepo.create({
      firstName: dto.ownerFirstName,
      lastName: dto.ownerLastName,
      email: dto.ownerEmail,
      password: hashedPassword,
      role: UserRole.OWNER,
      tenantId: tenant.id,
      isActive: true,
    });
    await this.userRepo.save(owner);

    // Seed all e-CF sequences (E31–E45)
    const sequences = DEFAULT_ECF_TYPES.map((type) =>
      this.ncfSequenceRepo.create({
        tenantId: tenant.id,
        ncfType: type,
        currentSequence: 0,
        startSequence: 1,
        endSequence: 9999999,
        isActive: true,
      }),
    );
    await this.ncfSequenceRepo.save(sequences);

    // Create main branch (always)
    const mainBranch = this.branchRepo.create({
      tenantId: tenant.id,
      name: 'Principal',
      isMain: true,
      isActive: true,
    });
    await this.branchRepo.save(mainBranch);

    const { password: _p, ...ownerSafe } = owner;

    // Send welcome email (non-blocking)
    this.mailService.sendWelcome(owner.email, {
      firstName: owner.firstName,
      businessName: tenant.businessName,
    }).catch(() => {});

    return { tenant, owner: ownerSafe };
  }

  async getTenantDetails(id: string) {
    const tenant = await this.tenantRepo.findOne({ where: { id } });
    if (!tenant) throw new NotFoundException('Negocio no encontrado');
    const users = await this.userRepo.find({
      where: { tenantId: id },
      select: ['id', 'email', 'firstName', 'lastName', 'role', 'isActive'],
    });
    const [saleCount, userCount] = await Promise.all([
      this.saleRepo.count({ where: { tenantId: id } }),
      this.userRepo.count({ where: { tenantId: id } }),
    ]);
    return { tenant, users, saleCount, userCount };
  }

  async updateTenant(id: string, dto: AdminUpdateTenantDto) {
    const tenant = await this.tenantRepo.findOne({ where: { id } });
    if (!tenant) throw new NotFoundException('Negocio no encontrado');

    if (dto.rnc && dto.rnc !== tenant.rnc) {
      const existing = await this.tenantRepo.findOne({ where: { rnc: dto.rnc } });
      if (existing) throw new ConflictException('Ya existe un negocio con ese RNC');
    }

    Object.assign(tenant, dto);
    return this.tenantRepo.save(tenant);
  }

  async toggleTenant(id: string, isActive: boolean) {
    await this.tenantRepo.update(id, { isActive });
    return this.tenantRepo.findOne({ where: { id } });
  }

  async deleteTenant(id: string) {
    const tenant = await this.tenantRepo.findOne({ where: { id } });
    if (!tenant) throw new NotFoundException('Negocio no encontrado');
    await this.tenantRepo.delete(id);
    return { success: true, message: 'Negocio eliminado' };
  }

  // ─── TENANT ALANUBE CONFIG ─────────────────────────────────────────────────

  async updateTenantAlanube(id: string, dto: { alanubeApiKey?: string; alanubeSandbox?: boolean }) {
    const tenant = await this.tenantRepo.findOne({ where: { id } });
    if (!tenant) throw new NotFoundException('Negocio no encontrado');
    Object.assign(tenant, dto);
    const saved = await this.tenantRepo.save(tenant);
    // Return without exposing full API key
    return {
      id: saved.id,
      alanubeSandbox: saved.alanubeSandbox,
      hasApiKey: !!saved.alanubeApiKey,
      alanubeApiKeyPreview: saved.alanubeApiKey
        ? `${saved.alanubeApiKey.substring(0, 8)}...`
        : null,
    };
  }

  // ─── TENANT USERS ──────────────────────────────────────────────────────────

  async getTenantUsers(tenantId: string) {
    return this.userRepo
      .createQueryBuilder('u')
      .select([
        'u.id', 'u.email', 'u.firstName', 'u.lastName',
        'u.role', 'u.isActive', 'u.isLocked', 'u.loginAttempts', 'u.tenantId',
      ])
      .where('u.tenantId = :tenantId', { tenantId })
      .getMany();
  }

  async createTenantUser(tenantId: string, dto: AdminCreateUserDto) {
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Negocio no encontrado');

    const existing = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Ya existe un usuario con ese email');

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = this.userRepo.create({
      ...dto,
      password: hashedPassword,
      tenantId,
      isActive: true,
    });
    const saved = await this.userRepo.save(user);
    const { password: _p, ...safe } = saved;
    return safe;
  }

  async toggleUser(userId: string, isActive: boolean) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    await this.userRepo.update(userId, { isActive });
    return this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'email', 'firstName', 'lastName', 'role', 'isActive'],
    });
  }

  async resetUserPassword(userId: string, newPassword: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    const hashed = await bcrypt.hash(newPassword, 10);
    await this.userRepo.update(userId, { password: hashed });
    return { success: true, message: 'Contraseña actualizada' };
  }

  async deleteUser(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    await this.userRepo.delete(userId);
    return { success: true };
  }

  // ─── BILLING ───────────────────────────────────────────────────────────────

  async getBillingOverview() {
    const tenants = await this.tenantRepo.find({ order: { createdAt: 'DESC' } });
    const planPrices: Record<string, number> = { free: 0, basic: 1500, pro: 3500, enterprise: 8000 };

    return tenants.map((t) => {
      const now = new Date();
      let status = t.subscriptionStatus ?? 'trial';
      if (t.subscriptionEndDate && new Date(t.subscriptionEndDate) < now) {
        status = 'expired';
      }

      // Compute next billing date: same day next month from subscriptionStartDate
      let nextBillingDate: Date | null = null;
      if (t.subscriptionStartDate && status === 'active') {
        const start = new Date(t.subscriptionStartDate);
        nextBillingDate = new Date(start);
        while (nextBillingDate <= now) {
          nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
        }
      }

      return {
        id: t.id,
        businessName: t.businessName,
        plan: t.plan,
        subscriptionStatus: status,
        subscriptionStartDate: t.subscriptionStartDate ?? null,
        subscriptionEndDate: t.subscriptionEndDate ?? null,
        nextBillingDate,
        monthlyPrice: planPrices[t.plan] ?? 0,
        isActive: t.isActive,
        email: t.email,
      };
    });
  }

  async updateTenantBilling(id: string, dto: { subscriptionStartDate?: string; subscriptionEndDate?: string; subscriptionStatus?: string; plan?: string }) {
    const tenant = await this.tenantRepo.findOne({ where: { id } });
    if (!tenant) throw new NotFoundException('Negocio no encontrado');
    if (dto.subscriptionStartDate) tenant.subscriptionStartDate = new Date(dto.subscriptionStartDate);
    if (dto.subscriptionEndDate) tenant.subscriptionEndDate = new Date(dto.subscriptionEndDate);
    if (dto.subscriptionStatus) tenant.subscriptionStatus = dto.subscriptionStatus;
    if (dto.plan) tenant.plan = dto.plan as TenantPlan;
    return this.tenantRepo.save(tenant);
  }

  // ─── IMPERSONATION ─────────────────────────────────────────────────────────

  async impersonateUser(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const payload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
    };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '2h' });
    return { accessToken, user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role, tenantId: user.tenantId } };
  }

  // ─── PER-TENANT METRICS ────────────────────────────────────────────────────

  async getTenantMetrics() {
    const tenants = await this.tenantRepo.find({ order: { createdAt: 'DESC' } });
    const result: any[] = [];

    for (const t of tenants) {
      const [userCount, saleCount, activeUsers, revenueResult] = await Promise.all([
        this.userRepo.count({ where: { tenantId: t.id } }),
        this.saleRepo.count({ where: { tenantId: t.id } }),
        this.userRepo.count({ where: { tenantId: t.id, isActive: true } }),
        this.saleRepo
          .createQueryBuilder('sale')
          .select('SUM(sale.total)', 'totalRevenue')
          .addSelect('MAX(sale.createdAt)', 'lastActivity')
          .where('sale.tenantId = :tenantId', { tenantId: t.id })
          .getRawOne(),
      ]);

      result.push({
        id: t.id,
        businessName: t.businessName,
        businessType: t.businessType,
        plan: t.plan,
        isActive: t.isActive,
        createdAt: t.createdAt,
        userCount,
        activeUsers,
        saleCount,
        totalRevenue: parseFloat(revenueResult?.totalRevenue ?? '0'),
        lastActivityAt: revenueResult?.lastActivity ?? null,
      });
    }
    return result;
  }

  // ─── GLOBAL USER SEARCH ────────────────────────────────────────────────────

  async getAllUsers() {
    const tenants = await this.tenantRepo.find({ select: ['id', 'businessName'] });
    const tenantMap = Object.fromEntries(tenants.map((t) => [t.id, t.businessName]));

    const users = await this.userRepo.find({
      select: ['id', 'email', 'firstName', 'lastName', 'role', 'isActive', 'tenantId'],
      order: { createdAt: 'DESC' },
    });

    return users.map((u) => ({
      ...u,
      tenantName: u.tenantId ? (tenantMap[u.tenantId] ?? '—') : '—',
    }));
  }

  async getLockedUsers() {
    return this.userRepo.query(`
      SELECT u.id, u.email, u."firstName", u."lastName", u.role,
             u."tenantId", u."loginAttempts",
             COALESCE(t."businessName", '—') AS "tenantName"
      FROM users u
      LEFT JOIN tenants t ON u."tenantId"::uuid = t.id
      WHERE u."isLocked" = true
        AND u."deletedAt" IS NULL
      ORDER BY u."firstName"
    `);
  }

  // ─── PLATFORM SETTINGS ─────────────────────────────────────────────────────

  async getSettings(): Promise<Record<string, string>> {
    const rows = await this.settingRepo.find();
    return Object.fromEntries(rows.map((r) => [r.key, r.value ?? '']));
  }

  async saveSettings(settings: Record<string, string>) {
    for (const [key, value] of Object.entries(settings)) {
      await this.settingRepo.upsert({ key, value }, ['key']);
    }
    return this.getSettings();
  }

  async getSetting(key: string): Promise<string | null> {
    const row = await this.settingRepo.findOne({ where: { key } });
    return row?.value ?? null;
  }

  // Endpoint público (sin auth) — solo precios y nombre de la plataforma
  async getPublicSettings() {
    const rows = await this.settingRepo.find();
    const map = Object.fromEntries(rows.map(r => [r.key, r.value ?? '']));
    return {
      platformName:      map['platform_name']        ?? 'FiscalRD',
      planPriceBasic:    Number(map['plan_price_basic'])    || 2500,
      planPricePro:      Number(map['plan_price_pro'])      || 4500,
      planPriceEnterprise: Number(map['plan_price_enterprise']) || 5500,
    };
  }
}
