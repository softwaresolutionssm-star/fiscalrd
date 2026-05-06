import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Quotation } from './quotation.entity';

@Entity('quotation_items')
export class QuotationItem extends BaseEntity {
  @ManyToOne(() => Quotation, (q) => q.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quotationId' })
  quotation: Quotation;

  @Column()
  quotationId: string;

  @Column()
  description: string;

  @Column('decimal', { precision: 12, scale: 2 })
  quantity: number;

  @Column('decimal', { precision: 12, scale: 2 })
  unitPrice: number;

  @Column('decimal', { precision: 5, scale: 2, default: 18 })
  itbisRate: number;

  @Column('decimal', { precision: 12, scale: 2 })
  subtotal: number;

  @Column('decimal', { precision: 12, scale: 2 })
  itbisAmount: number;

  @Column('decimal', { precision: 12, scale: 2 })
  total: number;
}
