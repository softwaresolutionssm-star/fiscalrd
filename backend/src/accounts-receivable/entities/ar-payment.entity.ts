import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { AccountsReceivable } from './accounts-receivable.entity';

export enum PaymentMethod {
  CASH = 'CASH',
  TRANSFER = 'TRANSFER',
  CARD = 'CARD',
  CHECK = 'CHECK',
}

@Entity('ar_payments')
export class ArPayment extends BaseEntity {
  @Column() arId: string;
  @ManyToOne(() => AccountsReceivable, ar => ar.payments) @JoinColumn({ name: 'arId' }) accountsReceivable: AccountsReceivable;
  @Column({ type: 'date' }) paymentDate: Date;
  @Column({ type: 'decimal', precision: 18, scale: 2 }) amount: number;
  @Column({ type: 'enum', enum: PaymentMethod, default: PaymentMethod.CASH }) method: PaymentMethod;
  @Column({ nullable: true }) reference: string;
  @Column({ nullable: true }) notes: string;
}
