import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { JournalLine } from './journal-line.entity';

export enum JournalEntryStatus {
  DRAFT = 'DRAFT',
  POSTED = 'POSTED',
  CANCELLED = 'CANCELLED',
}

@Entity('journal_entries')
export class JournalEntry extends BaseEntity {
  @Column()
  tenantId: string;

  @Column()
  date: Date;

  @Column()
  description: string;

  @Column({ nullable: true })
  reference: string;

  @Column({ type: 'enum', enum: JournalEntryStatus, default: JournalEntryStatus.DRAFT })
  status: JournalEntryStatus;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  totalDebit: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  totalCredit: number;

  @OneToMany(() => JournalLine, (l) => l.journalEntry, { cascade: true })
  lines: JournalLine[];
}
