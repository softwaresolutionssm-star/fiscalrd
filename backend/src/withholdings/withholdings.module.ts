import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Withholding } from './entities/withholding.entity';
import { WithholdingsService } from './withholdings.service';
import { WithholdingsController } from './withholdings.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Withholding])],
  controllers: [WithholdingsController],
  providers: [WithholdingsService],
  exports: [WithholdingsService],
})
export class WithholdingsModule {}
