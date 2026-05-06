import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { QuotationsService } from './quotations.service';
import { CreateQuotationDto } from './dto/create-quotation.dto';
import { QuotationStatus } from './entities/quotation.entity';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

interface AuthUser { id: string; tenantId: string; role: string; branchId: string | null; }

@Controller('quotations')
@UseGuards(JwtAuthGuard)
export class QuotationsController {
  constructor(private readonly quotationsService: QuotationsService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateQuotationDto) {
    return this.quotationsService.create(user.tenantId, dto, user.branchId);
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.quotationsService.findAll(user.tenantId, user.branchId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.quotationsService.findOne(id, user.tenantId);
  }

  @Patch(':id/status')
  updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query('status') status: QuotationStatus,
  ) {
    return this.quotationsService.updateStatus(id, user.tenantId, status);
  }

  @Get(':id/convert-to-sale')
  convertToSale(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.quotationsService.convertToSale(id, user.tenantId);
  }
}
