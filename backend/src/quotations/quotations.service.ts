import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { todayDR } from '../common/utils/date.utils';
import { Quotation, QuotationStatus } from './entities/quotation.entity';
import { QuotationItem } from './entities/quotation-item.entity';
import { CreateQuotationDto } from './dto/create-quotation.dto';

@Injectable()
export class QuotationsService {
  constructor(
    @InjectRepository(Quotation)
    private readonly quotationRepo: Repository<Quotation>,
    @InjectRepository(QuotationItem)
    private readonly itemRepo: Repository<QuotationItem>,
  ) {}

  private async generateQuoteNumber(tenantId: string): Promise<string> {
    const count = await this.quotationRepo.count({ where: { tenantId } });
    return `COT-${String(count + 1).padStart(4, '0')}`;
  }

  async create(tenantId: string, dto: CreateQuotationDto, branchId?: string | null): Promise<Quotation> {
    const quoteNumber = await this.generateQuoteNumber(tenantId);

    const items = dto.items.map((itemDto) => {
      const itbisRate = itemDto.itbisRate ?? 18;
      const subtotal = Number(itemDto.unitPrice) * Number(itemDto.quantity);
      const itbisAmount = subtotal * (itbisRate / 100);
      const total = subtotal + itbisAmount;
      return this.itemRepo.create({
        description: itemDto.description,
        quantity: itemDto.quantity,
        unitPrice: itemDto.unitPrice,
        itbisRate,
        subtotal: Math.round(subtotal * 100) / 100,
        itbisAmount: Math.round(itbisAmount * 100) / 100,
        total: Math.round(total * 100) / 100,
      });
    });

    const subtotal = items.reduce((acc, i) => acc + Number(i.subtotal), 0);
    const itbisTotal = items.reduce((acc, i) => acc + Number(i.itbisAmount), 0);
    const total = subtotal + itbisTotal;

    const quotation = this.quotationRepo.create({
      tenantId,
      branchId: branchId ?? null,
      quoteNumber,
      customerId: dto.customerId,
      customerName: dto.customerName,
      customerRnc: dto.customerRnc,
      quoteDate: dto.quoteDate as unknown as Date,
      validUntil: dto.validUntil as unknown as Date,
      status: dto.status ?? QuotationStatus.DRAFT,
      notes: dto.notes,
      subtotal: Math.round(subtotal * 100) / 100,
      itbisTotal: Math.round(itbisTotal * 100) / 100,
      total: Math.round(total * 100) / 100,
      items,
    });

    return this.quotationRepo.save(quotation);
  }

  async findAll(tenantId: string, branchId?: string | null): Promise<Quotation[]> {
    const where: any = { tenantId };
    if (branchId) where.branchId = branchId;
    return this.quotationRepo.find({
      where,
      relations: ['items'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, tenantId: string): Promise<Quotation> {
    const quotation = await this.quotationRepo.findOne({
      where: { id, tenantId },
      relations: ['items'],
    });
    if (!quotation) {
      throw new NotFoundException(`Quotation ${id} not found`);
    }
    return quotation;
  }

  async updateStatus(id: string, tenantId: string, status: QuotationStatus): Promise<Quotation> {
    const quotation = await this.findOne(id, tenantId);
    quotation.status = status;
    return this.quotationRepo.save(quotation);
  }

  async convertToSale(id: string, tenantId: string) {
    const quotation = await this.findOne(id, tenantId);
    return {
      customerId: quotation.customerId,
      customerName: quotation.customerName,
      customerRncCedula: quotation.customerRnc,
      saleDate: todayDR(),
      notes: `Convertida de cotización ${quotation.quoteNumber}`,
      items: quotation.items.map((item) => ({
        description: item.description,
        productName: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        itbisRate: item.itbisRate,
      })),
      sourceQuotationId: quotation.id,
      sourceQuoteNumber: quotation.quoteNumber,
    };
  }
}
