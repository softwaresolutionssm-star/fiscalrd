import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

export enum AccountType {
  ASSET = 'ASSET',
  LIABILITY = 'LIABILITY',
  EQUITY = 'EQUITY',
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

@Entity('accounts')
export class Account extends BaseEntity {
  @Column()
  tenantId: string;

  @Column({ length: 20 })
  code: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: AccountType })
  type: AccountType;

  @Column({ nullable: true })
  parentId: string;

  @ManyToOne(() => Account, { nullable: true })
  @JoinColumn({ name: 'parentId' })
  parent: Account;

  @OneToMany(() => Account, (a) => a.parent)
  children: Account[];

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isSystem: boolean;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  balance: number;
}
