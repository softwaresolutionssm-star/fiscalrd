import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { ArPayment } from './ar-payment.entity';

export enum ArStatus {
  PENDING = 'PENDING',     // Pendiente
  PARTIAL = 'PARTIAL',     // Pago parcial
  PAID = 'PAID',           // Pagada
  OVERDUE = 'OVERDUE',     // Vencida
  CANCELLED = 'CANCELLED',
}

@Entity('accounts_receivable')
export class AccountsReceivable extends BaseEntity {
  @Column() tenantId: string;
  @Column({ type: 'varchar', nullable: true }) branchId: string | null;
  @Column() customerId: string;
  @Column({ nullable: true }) customerName: string;
  @Column({ nullable: true }) saleId: string;
  @Column({ nullable: true }) ncfNumber: string;
  @Column({ type: 'date' }) issueDate: Date;
  @Column({ type: 'date' }) dueDate: Date;
  @Column({ type: 'decimal', precision: 18, scale: 2 }) amount: number;
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 }) paidAmount: number;
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 }) balance: number;
  @Column({ type: 'enum', enum: ArStatus, default: ArStatus.PENDING }) status: ArStatus;
  @Column({ nullable: true }) notes: string;
  @OneToMany(() => ArPayment, p => p.accountsReceivable, { cascade: true }) payments: ArPayment[];
}
