import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Sale } from './sale.entity';

@Entity('sale_items')
export class SaleItem extends BaseEntity {
  @ManyToOne(() => Sale, (sale) => sale.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'saleId' })
  sale: Sale;

  @Column()
  saleId: string;

  @Column({ nullable: true })
  productId: string;

  @Column()
  productName: string;

  @Column('decimal', { precision: 12, scale: 2 })
  unitPrice: number;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  quantity: number;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  discountPct: number; // discount percentage 0–100

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  discountAmount: number; // computed discount amount

  @Column({ type: 'varchar', length: 10, default: 'UND' })
  unitOfMeasure: string; // UND, KGM, LTR, MTR, etc. (DGII UNM codes)

  @Column({ type: 'int', default: 18 })
  itbisRate: number;

  @Column('decimal', { precision: 12, scale: 2 })
  itbisAmount: number;

  @Column('decimal', { precision: 12, scale: 2 })
  subtotal: number; // unitPrice * quantity

  @Column('decimal', { precision: 12, scale: 2 })
  total: number; // subtotal + itbisAmount

  @Column('decimal', { precision: 12, scale: 2, nullable: true })
  costPrice: number | null; // snapshot of product cost at time of sale (for COGS)
}
