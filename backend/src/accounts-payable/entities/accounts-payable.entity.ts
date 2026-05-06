import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { ApPayment } from './ap-payment.entity';

export enum ApStatus {
  PENDING = 'PENDING',     // Pendiente
  PARTIAL = 'PARTIAL',     // Pago parcial
  PAID = 'PAID',           // Pagada
  OVERDUE = 'OVERDUE',     // Vencida
  CANCELLED = 'CANCELLED',
}

@Entity('accounts_payable')
export class AccountsPayable extends BaseEntity {
  @Column() tenantId: string;
  @Column({ type: 'varchar', nullable: true }) branchId: string | null;
  @Column() supplierId: string;
  @Column({ nullable: true }) supplierName: string;
  @Column({ nullable: true }) purchaseId: string;
  @Column({ nullable: true }) ncfNumber: string;
  @Column({ type: 'date' }) issueDate: Date;
  @Column({ type: 'date' }) dueDate: Date;
  @Column({ type: 'decimal', precision: 18, scale: 2 }) amount: number;
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 }) paidAmount: number;
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 }) balance: number;
  @Column({ type: 'enum', enum: ApStatus, default: ApStatus.PENDING }) status: ApStatus;
  @Column({ nullable: true }) notes: string;
  @OneToMany(() => ApPayment, p => p.accountsPayable, { cascade: true }) payments: ApPayment[];
}
