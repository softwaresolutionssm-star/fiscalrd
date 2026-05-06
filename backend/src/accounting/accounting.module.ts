import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account } from './entities/account.entity';
import { JournalEntry } from './entities/journal-entry.entity';
import { JournalLine } from './entities/journal-line.entity';
import { AccountingService } from './accounting.service';
import { AccountingController } from './accounting.controller';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Account, JournalEntry, JournalLine])],
  controllers: [AccountingController],
  providers: [AccountingService],
  exports: [AccountingService],
})
export class AccountingModule {}
