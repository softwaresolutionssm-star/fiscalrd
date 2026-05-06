import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NcfSequence } from './entities/ncf-sequence.entity';
import { NcfType } from '../common/enums/ncf-type.enum';
import { CreateNcfSequenceDto } from './dto/create-ncf-sequence.dto';

@Injectable()
export class NcfSequencesService {
  constructor(
    @InjectRepository(NcfSequence)
    private readonly ncfRepo: Repository<NcfSequence>,
  ) {}

  async create(tenantId: string, dto: CreateNcfSequenceDto): Promise<NcfSequence> {
    const seq = this.ncfRepo.create({
      tenantId,
      ncfType: dto.ncfType,
      startSequence: dto.startSequence ?? 1,
      endSequence: dto.endSequence ?? 9999999,
      currentSequence: 0,
    });
    return this.ncfRepo.save(seq);
  }

  async findAll(tenantId: string): Promise<NcfSequence[]> {
    return this.ncfRepo.find({ where: { tenantId } });
  }

  async getNextNcf(tenantId: string, ncfType: NcfType): Promise<string> {
    const seq = await this.ncfRepo.findOne({ where: { tenantId, ncfType, isActive: true } });
    if (!seq) throw new NotFoundException(`No hay secuencia configurada para NCF tipo ${ncfType}`);

    const next = seq.currentSequence + 1;
    if (next > seq.endSequence) {
      throw new BadRequestException(`La secuencia NCF ${ncfType} ha llegado al límite`);
    }

    await this.ncfRepo.update(seq.id, { currentSequence: next });
    // Format: B01 + 8-digit sequence = B0100000001
    return `${ncfType}${String(next).padStart(8, '0')}`;
  }

  async reserveBlock(tenantId: string, ncfType: string, count = 10): Promise<string[]> {
    const seq = await this.ncfRepo.findOne({ where: { tenantId, ncfType: ncfType as NcfType, isActive: true } });
    if (!seq) throw new NotFoundException(`No hay secuencia activa para ${ncfType}`);

    const start = seq.currentSequence + 1;
    const end = start + count - 1;

    if (end > seq.endSequence) throw new BadRequestException('No hay suficientes NCFs disponibles');

    await this.ncfRepo.update(seq.id, { currentSequence: end });

    const result: string[] = [];
    for (let i = start; i <= end; i++) {
      result.push(`${ncfType}${String(i).padStart(8, '0')}`);
    }
    return result;
  }
}
