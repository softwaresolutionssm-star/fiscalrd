import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

export enum CustomerType {
  INDIVIDUAL = 'individual',
  BUSINESS = 'business',
}

@Entity('customers')
export class Customer extends BaseEntity {
  @Column()
  tenantId: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: CustomerType, default: CustomerType.INDIVIDUAL })
  type: CustomerType;

  // Cédula (11 digits) for individuals, RNC (9 digits) for businesses
  @Column({ nullable: true, length: 11 })
  cedula: string;

  @Column({ nullable: true, length: 9 })
  rnc: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  address: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0, nullable: true })
  creditLimit: number; // 0 = sin límite
}
