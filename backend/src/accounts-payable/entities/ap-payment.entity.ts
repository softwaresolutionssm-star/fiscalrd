import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { AccountsPayable } from './accounts-payable.entity';

export enum ApPaymentMethod {
  CASH = 'CASH',
  TRANSFER = 'TRANSFER',
  CARD = 'CARD',
  CHECK = 'CHECK',
}

@Entity('ap_payments')
export class ApPayment extends BaseEntity {
  @Column() apId: string;
  @ManyToOne(() => AccountsPayable, ap => ap.payments) @JoinColumn({ name: 'apId' }) accountsPayable: AccountsPayable;
  @Column({ type: 'date' }) paymentDate: Date;
  @Column({ type: 'decimal', precision: 18, scale: 2 }) amount: number;
  @Column({ type: 'enum', enum: ApPaymentMethod, default: ApPaymentMethod.CASH }) method: ApPaymentMethod;
  @Column({ nullable: true }) reference: string;
  @Column({ nullable: true }) notes: string;
}
