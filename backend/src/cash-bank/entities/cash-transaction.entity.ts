import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

export enum TransactionType {
  INCOME = 'INCOME',   // Ingreso/cobro
  EXPENSE = 'EXPENSE', // Egreso/pago
}

export enum PaymentMethod {
  CASH = 'CASH',
  TRANSFER = 'TRANSFER',
  CARD = 'CARD',
  CHECK = 'CHECK',
}

export enum TransactionCategory {
  SALE = 'SALE',
  PURCHASE = 'PURCHASE',
  PAYROLL = 'PAYROLL',
  TAX = 'TAX',
  EXPENSE = 'EXPENSE',
  OTHER = 'OTHER',
}

@Entity('cash_transactions')
export class CashTransaction extends BaseEntity {
  @Column() tenantId: string;
  @Column({ type: 'varchar', nullable: true }) branchId: string | null;
  @Column({ type: 'enum', enum: TransactionType }) type: TransactionType;
  @Column({ type: 'enum', enum: PaymentMethod, default: PaymentMethod.CASH }) method: PaymentMethod;
  @Column({ type: 'enum', enum: TransactionCategory, default: TransactionCategory.OTHER }) category: TransactionCategory;
  @Column({ type: 'date' }) transactionDate: Date;
  @Column() description: string;
  @Column({ type: 'decimal', precision: 18, scale: 2 }) amount: number;
  @Column({ nullable: true }) reference: string;
  @Column({ nullable: true }) bankAccount: string;
  @Column({ nullable: true }) notes: string;

  // ─── Conciliación bancaria ────────────────────────────────────────────────
  @Column({ default: false }) reconciled: boolean;
  @Column({ type: 'timestamptz', nullable: true }) reconciledAt: Date | null;
  @Column({ type: 'varchar', nullable: true }) bankStatementRef: string | null;
}
