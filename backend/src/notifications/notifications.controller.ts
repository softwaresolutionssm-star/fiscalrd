import { Controller, Get, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

interface AuthUser { id: string; tenantId: string; role: string; }

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query('unread') unread?: string) {
    return this.service.findAll(user.tenantId, unread === 'true');
  }

  @Get('count')
  countUnread(@CurrentUser() user: AuthUser) {
    return this.service.countUnread(user.tenantId);
  }

  @Patch('read-all')
  markAllRead(@CurrentUser() user: AuthUser) {
    return this.service.markAllRead(user.tenantId);
  }

  @Patch(':id/read')
  markOneRead(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.markOneRead(id, user.tenantId);
  }
}
