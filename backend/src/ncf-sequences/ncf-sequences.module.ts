import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NcfSequence } from './entities/ncf-sequence.entity';
import { NcfSequencesService } from './ncf-sequences.service';
import { NcfSequencesController } from './ncf-sequences.controller';

@Module({
  imports: [TypeOrmModule.forFeature([NcfSequence])],
  controllers: [NcfSequencesController],
  providers: [NcfSequencesService],
  exports: [NcfSequencesService],
})
export class NcfSequencesModule {}
