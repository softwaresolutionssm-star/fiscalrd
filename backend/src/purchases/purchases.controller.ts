import { Controller, Get, Post, Body, Param, Patch, Query, Req, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { mkdirSync } from 'fs';
import { PurchasesService } from './purchases.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums/roles.enum';

interface AuthUser { id: string; tenantId: string; branchId: string | null; }

@Controller('purchases')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.ACCOUNTANT, UserRole.MANAGER)
export class PurchasesController {
  constructor(private readonly svc: PurchasesService) {}

  @Post() create(@CurrentUser() user: AuthUser, @Body() dto: CreatePurchaseDto) { return this.svc.create(user.tenantId, dto, user.branchId); }

  @Post('upload-document')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (_req, _file, cb) => {
        const dir = join(process.cwd(), 'uploads', 'purchase-docs');
        mkdirSync(dir, { recursive: true });
        cb(null, dir);
      },
      filename: (_req, file, cb) => {
        cb(null, `doc-${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname)}`);
      },
    }),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    fileFilter: (_req, file, cb) => {
      if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp|pdf)$/)) {
        return cb(new BadRequestException('Solo imágenes o PDF'), false);
      }
      cb(null, true);
    },
  }))
  uploadDocument(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    if (!file) throw new BadRequestException('No se recibió archivo');
    const protocol = req.headers['x-forwarded-proto'] ?? req.protocol;
    const host = req.headers['x-forwarded-host'] ?? req.get('host');
    return { url: `${protocol}://${host}/uploads/purchase-docs/${file.filename}` };
  }
  @Get() findAll(@CurrentUser() user: AuthUser) { return this.svc.findAll(user.tenantId, user.branchId); }
  @Get('report606') report606(@CurrentUser() user: AuthUser, @Query('year') year: string, @Query('month') month: string) {
    const now = new Date();
    return this.svc.report606Data(user.tenantId, year ? parseInt(year) : now.getFullYear(), month ? parseInt(month) : now.getMonth() + 1);
  }
  @Get(':id') findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) { return this.svc.findOne(id, user.tenantId); }
  @Patch(':id/confirm') confirm(@Param('id') id: string, @CurrentUser() user: AuthUser) { return this.svc.confirm(id, user.tenantId); }
}
