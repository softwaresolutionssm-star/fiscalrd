import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

export interface AuditLogDto {
  tenantId?: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  action: string;
  entity?: string;
  entityId?: string;
  details?: Record<string, any>;
  ip?: string;
}

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly repo: Repository<AuditLog>,
  ) {}

  log(dto: AuditLogDto): void {
    // Fire-and-forget — never throws, never blocks
    this.repo.save(this.repo.create(dto)).catch(() => null);
  }

  async findByTenant(
    tenantId: string,
    limit = 100,
    offset = 0,
    entity?: string,
  ): Promise<{ data: AuditLog[]; total: number }> {
    const qb = this.repo
      .createQueryBuilder('a')
      .where('a.tenantId = :tenantId', { tenantId })
      .orderBy('a.createdAt', 'DESC')
      .take(limit)
      .skip(offset);

    if (entity) qb.andWhere('a.entity = :entity', { entity });

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async findAll(limit = 200, offset = 0): Promise<{ data: AuditLog[]; total: number }> {
    const [data, total] = await this.repo.findAndCount({
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
    return { data, total };
  }
}
