import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sale } from '../sales/entities/sale.entity';
import { Purchase } from '../purchases/entities/purchase.entity';
import { DgiiSubmission } from './entities/dgii-submission.entity';
import { Withholding } from '../withholdings/entities/withholding.entity';
import { DgiiReportsService } from './dgii-reports.service';
import { DgiiReportsController } from './dgii-reports.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Sale, Purchase, DgiiSubmission, Withholding])],
  controllers: [DgiiReportsController],
  providers: [DgiiReportsService],
  exports: [DgiiReportsService],
})
export class DgiiReportsModule {}
