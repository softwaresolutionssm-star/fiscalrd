import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { NcfSequencesService } from './ncf-sequences.service';
import { CreateNcfSequenceDto } from './dto/create-ncf-sequence.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ConsolidatedOnlyGuard } from '../common/guards/consolidated-only.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums/roles.enum';

interface AuthUser { id: string; tenantId: string; role: string; }

@Controller('ncf-sequences')
@UseGuards(JwtAuthGuard, RolesGuard, ConsolidatedOnlyGuard)
export class NcfSequencesController {
  constructor(private readonly ncfService: NcfSequencesService) {}

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateNcfSequenceDto) {
    return this.ncfService.create(user.tenantId, dto);
  }

  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.ACCOUNTANT)
  findAll(@CurrentUser() user: AuthUser) {
    return this.ncfService.findAll(user.tenantId);
  }

  @Post('reserve-block')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  reserveBlock(
    @CurrentUser() user: AuthUser,
    @Body() body: { ncfType: string; count?: number },
  ) {
    return this.ncfService.reserveBlock(user.tenantId, body.ncfType, body.count ?? 10);
  }
}
