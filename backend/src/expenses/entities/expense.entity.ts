import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('expenses')
export class Expense extends BaseEntity {
  @Column() tenantId: string;
  @Column({ type: 'varchar', nullable: true }) branchId: string | null;
  @Column() category: string; // ALQUILER | ELECTRICIDAD | COMUNICACIONES | TRANSPORTE | SUELDOS | MARKETING | SERVICIOS_BANCARIOS | MANTENIMIENTO | PAPELERIA | IMPUESTOS | OTROS
  @Column() description: string;
  @Column('decimal', { precision: 12, scale: 2 }) amount: number;
  @Column({ type: 'date' }) expenseDate: Date;
  @Column({ nullable: true }) supplierName: string;
  @Column({ nullable: true }) supplierRnc: string;
  @Column({ nullable: true }) ncfNumber: string;
  @Column({ nullable: true }) reference: string;
  @Column({ nullable: true }) notes: string;
  @Column({ default: false }) hasItbis: boolean;
  @Column('decimal', { precision: 12, scale: 2, default: 0 }) itbisAmount: number;
  @Column({ nullable: true }) paymentMethod: string;
}
