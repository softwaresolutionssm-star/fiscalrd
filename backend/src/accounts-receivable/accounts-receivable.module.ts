import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountsReceivable } from './entities/accounts-receivable.entity';
import { ArPayment } from './entities/ar-payment.entity';
import { AccountsReceivableService } from './accounts-receivable.service';
import { AccountsReceivableController } from './accounts-receivable.controller';
import { Customer } from '../customers/entities/customer.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AccountsReceivable, ArPayment, Customer])],
  controllers: [AccountsReceivableController],
  providers: [AccountsReceivableService],
  exports: [AccountsReceivableService],
})
export class AccountsReceivableModule {}
