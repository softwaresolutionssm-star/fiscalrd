import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../common/enums/roles.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { AuditLogService } from './audit-log.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('audit-logs')
export class AuditLogController {
  constructor(private readonly service: AuditLogService) {}

  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Get()
  findByTenant(
    @CurrentUser() user: User,
    @Query('limit') limit = '100',
    @Query('offset') offset = '0',
    @Query('entity') entity?: string,
  ) {
    return this.service.findByTenant(user.tenantId, +limit, +offset, entity);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Get('all')
  findAll(
    @Query('limit') limit = '200',
    @Query('offset') offset = '0',
  ) {
    return this.service.findAll(+limit, +offset);
  }
}
