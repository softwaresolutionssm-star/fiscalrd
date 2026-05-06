import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountsPayable } from './entities/accounts-payable.entity';
import { ApPayment } from './entities/ap-payment.entity';
import { AccountsPayableService } from './accounts-payable.service';
import { AccountsPayableController } from './accounts-payable.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AccountsPayable, ApPayment])],
  controllers: [AccountsPayableController],
  providers: [AccountsPayableService],
  exports: [AccountsPayableService],
})
export class AccountsPayableModule {}
