import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { QuotationItem } from './quotation-item.entity';

export enum QuotationStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
}

@Entity('quotations')
export class Quotation extends BaseEntity {
  @Column()
  tenantId: string;

  @Column({ type: 'varchar', nullable: true })
  branchId: string | null;

  @Column({ nullable: true })
  customerId: string;

  @Column({ nullable: true })
  customerName: string;

  @Column({ nullable: true })
  customerRnc: string;

  @Column({ nullable: true })
  quoteNumber: string; // COT-0001

  @Column({ type: 'date' })
  quoteDate: Date;

  @Column({ type: 'date', nullable: true })
  validUntil: Date;

  @Column({ type: 'enum', enum: QuotationStatus, default: QuotationStatus.DRAFT })
  status: QuotationStatus;

  @Column('decimal', { precision: 18, scale: 2, default: 0 })
  subtotal: number;

  @Column('decimal', { precision: 18, scale: 2, default: 0 })
  itbisTotal: number;

  @Column('decimal', { precision: 18, scale: 2, default: 0 })
  total: number;

  @Column({ nullable: true })
  notes: string;

  @OneToMany(() => QuotationItem, (item) => item.quotation, { cascade: true, eager: true })
  items: QuotationItem[];
}
