import { Controller, Get } from '@nestjs/common';
import { AdminService } from './admin.service';
import { SkipBillingBlock } from '../common/decorators/skip-billing-block.decorator';

// Endpoints públicos — sin autenticación requerida
@Controller('admin')
export class AdminPublicController {
  constructor(private readonly adminService: AdminService) {}

  @Get('settings/public')
  @SkipBillingBlock()
  getPublicSettings() {
    return this.adminService.getPublicSettings();
  }
}
