import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlanubeService } from './alanube.service';
import { AlanubeController } from './alanube.controller';
import { Sale } from '../sales/entities/sale.entity';

@Module({
  imports: [HttpModule, TypeOrmModule.forFeature([Sale])],
  controllers: [AlanubeController],
  providers: [AlanubeService],
  exports: [AlanubeService],
})
export class AlanubeModule {}
