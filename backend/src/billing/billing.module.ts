import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { TenantPayment } from './entities/tenant-payment.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { PlatformSetting } from '../admin/entities/platform-setting.entity';
import { Branch } from '../branches/entities/branch.entity';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TenantPayment, Tenant, PlatformSetting, Branch]),
    ScheduleModule.forRoot(),
    MailModule,
  ],
  controllers: [BillingController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
