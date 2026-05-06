import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('exchange_rates')
export class ExchangeRate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 3, default: 'USD' })
  baseCurrency: string;

  @Column({ type: 'varchar', length: 3, default: 'DOP' })
  targetCurrency: string;

  @Column({ type: 'decimal', precision: 10, scale: 4 })
  rate: number; // DOP per 1 USD

  @Column({ type: 'varchar', nullable: true })
  source: string;

  @Column({ type: 'timestamptz' })
  fetchedAt: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
