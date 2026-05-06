import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { YearClosing } from './entities/year-closing.entity';
import { YearClosingService } from './year-closing.service';
import { YearClosingController } from './year-closing.controller';

@Module({
  imports: [TypeOrmModule.forFeature([YearClosing])],
  providers: [YearClosingService],
  controllers: [YearClosingController],
  exports: [YearClosingService],
})
export class YearClosingModule {}
