import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

export enum TableOrderStatus {
  OPEN      = 'OPEN',
  PAID      = 'PAID',
  CANCELLED = 'CANCELLED',
}

export interface TableOrderItem {
  productId?: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  itbisRate: number;
  subtotal: number;
  itbisAmount: number;
  total: number;
  notes?: string;
}

@Entity('table_orders')
export class TableOrder extends BaseEntity {
  @Column() tenantId: string;
  @Column({ type: 'varchar', nullable: true }) branchId: string | null;
  @Column() tableId: string;
  @Column() tableName: string;
  @Column({ nullable: true }) serverName: string; // mesero

  @Column({ type: 'jsonb', default: '[]' }) items: TableOrderItem[];

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 }) subtotal: number;
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 }) itbisTotal: number;
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 }) tipAmount: number;
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 }) total: number;

  @Column({ type: 'int', default: 1 }) guestCount: number;

  @Column({ type: 'enum', enum: TableOrderStatus, default: TableOrderStatus.OPEN }) status: TableOrderStatus;
  @Column({ nullable: true }) paymentMethod: string;
  @Column({ type: 'jsonb', nullable: true }) paymentSplits: Array<{ label: string; amount: number }> | null; // for bill splitting
  @Column({ nullable: true }) notes: string;
  @Column({ nullable: true }) saleId: string; // linked NCF

  @Column({ type: 'timestamptz' }) openedAt: Date;
  @Column({ type: 'timestamptz', nullable: true }) paidAt: Date;
}
