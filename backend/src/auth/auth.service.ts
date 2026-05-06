import { Injectable, UnauthorizedException, ConflictException, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { generateSecret, generateURI, verify } from 'otplib';
import * as QRCode from 'qrcode';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { RegisterTenantDto } from './dto/register-tenant.dto';
import { User } from '../users/entities/user.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { NcfSequence } from '../ncf-sequences/entities/ncf-sequence.entity';
import { Branch } from '../branches/entities/branch.entity';
import { UserRole } from '../common/enums/roles.enum';
import { DEFAULT_ECF_TYPES } from '../common/enums/ncf-type.enum';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    @InjectRepository(Tenant) private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(NcfSequence) private readonly ncfSequenceRepo: Repository<NcfSequence>,
    @InjectRepository(Branch) private readonly branchRepo: Repository<Branch>,
    private readonly mailService: MailService,
  ) {}

  static readonly MAX_LOGIN_ATTEMPTS = 5;

  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException('Credenciales inválidas');

    // super_admin is never subject to lockout
    const canBeLocked = user.role !== 'super_admin';

    if (canBeLocked && user.isLocked) {
      throw new ForbiddenException('Tu cuenta está bloqueada. Contacta a tu administrador para desbloquearla.');
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      if (canBeLocked) {
        user.loginAttempts = (user.loginAttempts ?? 0) + 1;
        if (user.loginAttempts >= AuthService.MAX_LOGIN_ATTEMPTS) {
          user.isLocked = true;
          await this.userRepo.save(user);
          throw new ForbiddenException('Cuenta bloqueada por demasiados intentos fallidos. Contacta a tu administrador.');
        }
        await this.userRepo.save(user);
        const remaining = AuthService.MAX_LOGIN_ATTEMPTS - user.loginAttempts;
        throw new UnauthorizedException(`Credenciales inválidas. ${remaining} intento${remaining === 1 ? '' : 's'} restante${remaining === 1 ? '' : 's'}.`);
      }
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Reset on successful login
    if (user.loginAttempts > 0) {
      user.loginAttempts = 0;
      await this.userRepo.save(user);
    }
    return user;
  }

  async login(user: User) {
    const payload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      branchId: user.branchId ?? null,
      permissions: user.permissions ?? null,
    };

    // Load tenant info for non-super-admin users
    let tenantInfo: { businessName?: string; businessType?: string; plan?: string } = {};
    if (user.tenantId) {
      const tenant = await this.tenantRepo.findOne({ where: { id: user.tenantId } });
      if (tenant) {
        tenantInfo = {
          businessName: tenant.businessName,
          businessType: tenant.businessType,
          plan: tenant.plan,
        };
      }
    }

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        tenantId: user.tenantId,
        branchId: user.branchId ?? null,
        permissions: user.permissions ?? null,
        ...tenantInfo,
      },
    };
  }

  async register(dto: RegisterDto) {
    const user = await this.usersService.create(dto);
    return this.login(user);
  }

  async registerTenant(dto: RegisterTenantDto) {
    // Check for duplicate RNC or email
    const existingTenant = await this.tenantRepo.findOne({ where: { rnc: dto.rnc } });
    if (existingTenant) {
      throw new ConflictException(`Ya existe un negocio registrado con el RNC ${dto.rnc}`);
    }
    const existingUser = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existingUser) {
      throw new ConflictException(`Ya existe un usuario con el email ${dto.email}`);
    }

    // Create tenant
    const tenant = this.tenantRepo.create({
      businessName: dto.businessName,
      rnc: dto.rnc,
      email: dto.email,
      phone: dto.phone,
      address: dto.address,
    });
    const savedTenant = await this.tenantRepo.save(tenant);

    // Create OWNER user
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = this.userRepo.create({
      email: dto.email,
      password: hashedPassword,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: UserRole.OWNER,
      tenantId: savedTenant.id,
    });
    const savedUser = await this.userRepo.save(user);

    // Seed default e-CF sequences (E31–E45 Ley 32-23)
    const sequences = DEFAULT_ECF_TYPES.map((ncfType) =>
      this.ncfSequenceRepo.create({
        tenantId: savedTenant.id,
        ncfType,
        startSequence: 1,
        endSequence: 9999999,
        currentSequence: 0,
      }),
    );
    await this.ncfSequenceRepo.save(sequences);

    // Auto-crear sucursal principal
    await this.branchRepo.save(
      this.branchRepo.create({
        tenantId: savedTenant.id,
        name: 'Principal',
        isMain: true,
        isActive: true,
      }),
    );

    const loginResult = await this.login(savedUser);
    return { ...loginResult, tenant: savedTenant };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Usuario no encontrado');

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) throw new BadRequestException('La contraseña actual es incorrecta');

    user.password = await bcrypt.hash(newPassword, 10);
    await this.userRepo.save(user);
  }

  async forgotPassword(email: string): Promise<{ ok: true }> {
    const user = await this.userRepo.findOne({ where: { email } });
    // Always return success to avoid email enumeration
    if (!user) return { ok: true };

    const token = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await this.userRepo.save(user);

    // Get business name for personalized email
    let businessName: string | undefined;
    if (user.tenantId) {
      const tenant = await this.tenantRepo.findOne({ where: { id: user.tenantId } });
      businessName = tenant?.businessName;
    }

    await this.mailService.sendForgotPassword(email, token, businessName);
    return { ok: true };
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { resetPasswordToken: token } });
    if (!user || !user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
      throw new BadRequestException('El enlace de recuperación es inválido o ha expirado');
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await this.userRepo.save(user);
  }

  async validateToken(token: string) {
    try {
      return this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }

  // ── 2FA ─────────────────────────────────────────────────────────────────────

  async setup2FA(userId: string): Promise<{ secret: string; qrCode: string; otpauthUrl: string }> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    const secret = generateSecret();
    const otpauthUrl = generateURI({ label: user.email, issuer: 'FiscalRD', secret });
    const qrCode = await QRCode.toDataURL(otpauthUrl);
    // Save secret (not yet enabled)
    await this.userRepo.update(userId, { twoFactorSecret: secret });
    return { secret, qrCode, otpauthUrl };
  }

  async enable2FA(userId: string, token: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user?.twoFactorSecret) throw new BadRequestException('Primero genera el QR de configuración');
    const valid = await verify({ token, secret: user.twoFactorSecret });
    if (!(valid as any).valid) throw new BadRequestException('Código incorrecto');
    await this.userRepo.update(userId, { twoFactorEnabled: true });
  }

  async disable2FA(userId: string, token: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user?.twoFactorEnabled || !user.twoFactorSecret) throw new BadRequestException('El 2FA no está activo');
    const valid = await verify({ token, secret: user.twoFactorSecret });
    if (!(valid as any).valid) throw new BadRequestException('Código incorrecto');
    await this.userRepo.update(userId, { twoFactorEnabled: false, twoFactorSecret: null });
  }

  async verify2FA(userId: string, token: string): Promise<boolean> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user?.twoFactorEnabled || !user.twoFactorSecret) return true; // not required
    const result = await verify({ token, secret: user.twoFactorSecret });
    return (result as any).valid === true;
  }
}
