import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CashTransaction } from './entities/cash-transaction.entity';
import { CashBankService } from './cash-bank.service';
import { CashBankController } from './cash-bank.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CashTransaction])],
  controllers: [CashBankController],
  providers: [CashBankService],
  exports: [CashBankService],
})
export class CashBankModule {}
