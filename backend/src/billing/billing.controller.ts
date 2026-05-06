import {
  Controller, Get, Post, Patch, Body, Param, Query, Req,
  UseGuards, UseInterceptors, UploadedFile, ParseUUIDPipe, BadRequestException, Delete,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { mkdirSync } from 'fs';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums/roles.enum';
import { SkipBillingBlock } from '../common/decorators/skip-billing-block.decorator';

interface AuthUser {
  id: string; tenantId: string; role: string;
  firstName: string; lastName: string; email: string;
  branchId: string | null;
}

@Controller('billing')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  // ─── OWNER / ADMIN: ver su facturación ──────────────────────────────────────

  @Get('my')
  @SkipBillingBlock()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getMyBilling(@CurrentUser() user: AuthUser) {
    // Owner (branchId=null) ve todo; Admin de sucursal ve solo su sucursal
    const branchId = user.role === 'owner' ? null : (user.branchId ?? null);
    return this.billingService.getMyBilling(user.tenantId, branchId);
  }

  @Post('my/submit')
  @SkipBillingBlock()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  submitPayment(
    @CurrentUser() user: AuthUser,
    @Body() dto: {
      paymentId: string;
      bankName: string;
      referenceNumber: string;
      transferAmount: number;
      proofNotes?: string;
      proofUrl?: string;
    },
  ) {
    const branchId = user.role === 'owner' ? null : (user.branchId ?? null);
    return this.billingService.submitPayment(user.tenantId, branchId, dto);
  }

  @Post('my/upload-proof')
  @SkipBillingBlock()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (_req, _file, cb) => {
        const dir = join(process.cwd(), 'uploads', 'billing-proofs');
        mkdirSync(dir, { recursive: true });
        cb(null, dir);
      },
      filename: (_req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `proof-${uniqueSuffix}${extname(file.originalname)}`);
      },
    }),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    fileFilter: (_req, file, cb) => {
      if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp|pdf)$/)) {
        return cb(new BadRequestException('Solo imágenes (JPG, PNG, WEBP) o PDF'), false);
      }
      cb(null, true);
    },
  }))
  uploadProof(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    if (!file) throw new BadRequestException('No se recibió ningún archivo');
    const protocol = req.headers['x-forwarded-proto'] ?? req.protocol;
    const host = req.headers['x-forwarded-host'] ?? req.get('host');
    const url = `${protocol}://${host}/uploads/billing-proofs/${file.filename}`;
    return { url };
  }

  // ─── SUPER ADMIN: control total ──────────────────────────────────────────────

  @Get('admin/overview')
  @Roles(UserRole.SUPER_ADMIN)
  getBillingOverview() {
    return this.billingService.getBillingOverview();
  }

  @Get('admin/payments')
  @Roles(UserRole.SUPER_ADMIN)
  getAllPayments(@Query('status') status?: string) {
    return this.billingService.getAllPayments(status);
  }

  @Get('admin/instructions')
  @Roles(UserRole.SUPER_ADMIN)
  getInstructions() {
    return this.billingService.getPaymentInstructions();
  }

  @Patch('admin/payments/:id/approve')
  @Roles(UserRole.SUPER_ADMIN)
  approvePayment(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.billingService.approvePayment(id, `${user.firstName} ${user.lastName}`);
  }

  @Patch('admin/payments/:id/reject')
  @Roles(UserRole.SUPER_ADMIN)
  rejectPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @Body('reason') reason: string,
  ) {
    return this.billingService.rejectPayment(id, reason, `${user.firstName} ${user.lastName}`);
  }

  @Patch('admin/payments/:id/waive')
  @Roles(UserRole.SUPER_ADMIN)
  waivePayment(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.billingService.waivedPayment(id, `${user.firstName} ${user.lastName}`);
  }

  @Post('admin/tenants/:id/manual-payment')
  @Roles(UserRole.SUPER_ADMIN)
  registerManualPayment(
    @Param('id', ParseUUIDPipe) tenantId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: {
      period: string;
      amount: number;
      paymentMethod: string;
      referenceNumber?: string;
      notes?: string;
    },
  ) {
    return this.billingService.registerManualPayment(tenantId, {
      ...dto,
      adminName: `${user.firstName} ${user.lastName}`,
    });
  }

  @Patch('admin/tenants/:id/block')
  @Roles(UserRole.SUPER_ADMIN)
  setBlocked(
    @Param('id', ParseUUIDPipe) tenantId: string,
    @Body('blocked') blocked: boolean,
    @Body('notes') notes?: string,
  ) {
    return this.billingService.setTenantBlocked(tenantId, blocked, notes);
  }

  @Patch('admin/tenants/:id/notes')
  @Roles(UserRole.SUPER_ADMIN)
  updateNotes(
    @Param('id', ParseUUIDPipe) tenantId: string,
    @Body('notes') notes: string,
  ) {
    return this.billingService.updateBillingNotes(tenantId, notes);
  }

  @Patch('admin/tenants/:id/discount')
  @Roles(UserRole.SUPER_ADMIN)
  updateDiscount(
    @Param('id', ParseUUIDPipe) tenantId: string,
    @Body('discountPct') discountPct: number,
  ) {
    return this.billingService.updateBillingDiscount(tenantId, discountPct);
  }

  @Patch('admin/payments/:id/revert')
  @Roles(UserRole.SUPER_ADMIN)
  revertPayment(@Param('id', ParseUUIDPipe) id: string) {
    return this.billingService.revertPayment(id);
  }

  @Post('admin/check')
  @Roles(UserRole.SUPER_ADMIN)
  triggerCheck() {
    return this.billingService.triggerManualCheck();
  }
}
