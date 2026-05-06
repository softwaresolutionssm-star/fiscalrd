import { Entity, Column, CreateDateColumn, PrimaryGeneratedColumn } from 'typeorm';

@Entity('dgii_submissions')
export class DgiiSubmission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  /** '606' | '607' | '608' | '623' | 'IT1' */
  @Column()
  reportType: string;

  /** YYYY-MM */
  @Column()
  period: string;

  @Column({ type: 'varchar', nullable: true })
  submittedBy: string | null;

  @Column({ type: 'varchar', nullable: true })
  notes: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
