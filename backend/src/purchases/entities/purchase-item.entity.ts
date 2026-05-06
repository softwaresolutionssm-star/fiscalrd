import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Purchase } from './purchase.entity';

@Entity('purchase_items')
export class PurchaseItem extends BaseEntity {
  @Column() purchaseId: string;
  @ManyToOne(() => Purchase, p => p.items) @JoinColumn({ name: 'purchaseId' }) purchase: Purchase;
  @Column({ nullable: true }) productId: string;
  @Column() description: string;
  @Column({ type: 'decimal', precision: 18, scale: 2 }) quantity: number;
  @Column({ type: 'decimal', precision: 18, scale: 2 }) unitCost: number;
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 18 }) itbisRate: number;
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 }) subtotal: number;
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 }) itbisAmount: number;
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 }) total: number;
}
