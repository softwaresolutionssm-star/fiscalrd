import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('withholdings')
export class Withholding extends BaseEntity {
  @Column() tenantId: string;
  @Column() type: string; // 'ITBIS_30' | 'ISR_10' | 'ISR_15'
  @Column() supplierName: string;
  @Column({ nullable: true }) supplierRnc: string;
  @Column({ nullable: true }) supplierCedula: string;
  @Column({ nullable: true }) ncfOriginal: string;
  @Column({ type: 'date' }) withholdingDate: Date;
  @Column('decimal', { precision: 12, scale: 2 }) baseAmount: number;
  @Column('decimal', { precision: 5, scale: 2 }) withholdingRate: number;
  @Column('decimal', { precision: 12, scale: 2 }) withholdingAmount: number;
  @Column('decimal', { precision: 12, scale: 2 }) netAmount: number;
  @Column({ nullable: true }) notes: string;
  @Column({ nullable: true }) period: string; // YYYY-MM
}
