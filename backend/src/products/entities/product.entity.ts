import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

export enum ItbisRate {
  EXEMPT = 0,
  RATE_16 = 16,
  RATE_18 = 18,
}

@Entity('products')
export class Product extends BaseEntity {
  @Column()
  tenantId: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  code: string; // SKU or internal code

  @Column({ nullable: true })
  barcode: string; // EAN-13 or other barcode

  @Column('decimal', { precision: 12, scale: 2 })
  price: number;

  @Column({ type: 'int', default: 18 })
  itbisRate: number; // 0, 16, or 18 percent

  @Column({ default: true })
  isService: boolean; // true = service, false = product

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  minStock: number; // alert threshold for low stock

  @Column('decimal', { precision: 12, scale: 2, nullable: true })
  costPrice: number | null; // purchase cost for COGS calculation

  @Column({ type: 'varchar', nullable: true })
  supplierId: string | null; // proveedor principal de este producto
}
