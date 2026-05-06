import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { JournalEntry } from './journal-entry.entity';
import { Account } from './account.entity';

@Entity('journal_lines')
export class JournalLine extends BaseEntity {
  @Column()
  journalEntryId: string;

  @ManyToOne(() => JournalEntry, (j) => j.lines)
  @JoinColumn({ name: 'journalEntryId' })
  journalEntry: JournalEntry;

  @Column()
  accountId: string;

  @ManyToOne(() => Account)
  @JoinColumn({ name: 'accountId' })
  account: Account;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  debit: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  credit: number;

  @Column({ nullable: true })
  description: string;
}
