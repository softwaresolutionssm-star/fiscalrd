import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CashRegisterSession } from './entities/cash-register-session.entity';
import { CashRegisterExpense } from './entities/cash-register-expense.entity';
import { CashRegisterService } from './cash-register.service';
import { CashRegisterController } from './cash-register.controller';
import { Sale } from '../sales/entities/sale.entity';
import { CashTransaction } from '../cash-bank/entities/cash-transaction.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CashRegisterSession, CashRegisterExpense, Sale, CashTransaction, User])],
  controllers: [CashRegisterController],
  providers: [CashRegisterService],
  exports: [CashRegisterService],
})
export class CashRegisterModule {}
