import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { PurchaseItem } from './purchase-item.entity';

export enum PurchaseStatus {
  DRAFT = 'DRAFT',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
}

@Entity('purchases')
export class Purchase extends BaseEntity {
  @Column() tenantId: string;
  @Column({ type: 'varchar', nullable: true }) branchId: string | null;
  @Column({ type: 'varchar', nullable: true }) supplierId: string | null;
  @Column({ nullable: true }) supplierName: string;
  @Column({ nullable: true }) supplierRnc: string;
  @Column({ nullable: true }) ncfNumber: string; // NCF del proveedor
  @Column({ nullable: true }) ncfType: string;
  @Column({ type: 'date' }) purchaseDate: Date;
  @Column({ type: 'enum', enum: PurchaseStatus, default: PurchaseStatus.DRAFT }) status: PurchaseStatus;
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 }) subtotal: number;
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 }) itbisTotal: number;
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 }) total: number;
  @Column({ type: 'boolean', default: false }) isCredit: boolean;
  @Column({ nullable: true }) dueDate: Date;
  @Column({ nullable: true }) notes: string;
  @Column({ type: 'varchar', nullable: true }) documentUrl: string | null;
  @OneToMany(() => PurchaseItem, item => item.purchase, { cascade: true }) items: PurchaseItem[];
}
