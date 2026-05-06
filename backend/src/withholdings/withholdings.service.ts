import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Withholding } from './entities/withholding.entity';
import { CreateWithholdingDto } from './dto/create-withholding.dto';

@Injectable()
export class WithholdingsService {
  constructor(
    @InjectRepository(Withholding) private repo: Repository<Withholding>,
  ) {}

  async create(tenantId: string, dto: CreateWithholdingDto): Promise<Withholding> {
    const withholdingAmount = Number(dto.baseAmount) * Number(dto.withholdingRate) / 100;
    const netAmount = Number(dto.baseAmount) - withholdingAmount;
    const period = dto.period ?? dto.withholdingDate.substring(0, 7);
    const w = this.repo.create({
      tenantId,
      type: dto.type,
      supplierName: dto.supplierName,
      supplierRnc: dto.supplierRnc,
      supplierCedula: dto.supplierCedula,
      ncfOriginal: dto.ncfOriginal,
      withholdingDate: new Date(dto.withholdingDate),
      baseAmount: dto.baseAmount,
      withholdingRate: dto.withholdingRate,
      withholdingAmount,
      netAmount,
      notes: dto.notes,
      period,
    });
    return this.repo.save(w);
  }

  async findAll(tenantId: string, filters?: { from?: string; to?: string; type?: string }): Promise<Withholding[]> {
    const qb = this.repo.createQueryBuilder('w')
      .where('w.tenantId = :tenantId', { tenantId })
      .orderBy('w.withholdingDate', 'DESC');

    if (filters?.from) qb.andWhere('w.withholdingDate >= :from', { from: filters.from });
    if (filters?.to) qb.andWhere('w.withholdingDate <= :to', { to: filters.to });
    if (filters?.type) qb.andWhere('w.type = :type', { type: filters.type });

    return qb.getMany();
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const w = await this.repo.findOne({ where: { id, tenantId } });
    if (!w) throw new NotFoundException('Retención no encontrada');
    await this.repo.remove(w);
  }

  async monthlyReport(tenantId: string, year: number, month: number) {
    const from = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const to = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const records = await this.repo.createQueryBuilder('w')
      .where('w.tenantId = :tenantId', { tenantId })
      .andWhere('w.withholdingDate >= :from', { from })
      .andWhere('w.withholdingDate <= :to', { to })
      .getMany();

    const grouped: Record<string, { count: number; baseAmount: number; withholdingAmount: number; netAmount: number }> = {};
    for (const r of records) {
      if (!grouped[r.type]) grouped[r.type] = { count: 0, baseAmount: 0, withholdingAmount: 0, netAmount: 0 };
      grouped[r.type].count += 1;
      grouped[r.type].baseAmount += Number(r.baseAmount);
      grouped[r.type].withholdingAmount += Number(r.withholdingAmount);
      grouped[r.type].netAmount += Number(r.netAmount);
    }

    const totalWithholding = records.reduce((s, r) => s + Number(r.withholdingAmount), 0);
    const totalBase = records.reduce((s, r) => s + Number(r.baseAmount), 0);

    return {
      period: `${year}-${String(month).padStart(2, '0')}`,
      totalRecords: records.length,
      totalBase,
      totalWithholding,
      byType: grouped,
    };
  }
}
