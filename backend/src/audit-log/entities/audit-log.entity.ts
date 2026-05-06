import { Entity, Column, CreateDateColumn, PrimaryGeneratedColumn, Index } from 'typeorm';

@Entity('audit_logs')
@Index(['tenantId', 'createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  tenantId: string;

  @Column({ nullable: true })
  userId: string;

  @Column({ nullable: true })
  userEmail: string;

  @Column({ nullable: true })
  userName: string;

  @Column()
  action: string; // SALE_CREATED, SALE_CANCELLED, USER_LOGIN, etc.

  @Column({ nullable: true })
  entity: string; // sale, purchase, user, etc.

  @Column({ nullable: true })
  entityId: string;

  @Column({ type: 'jsonb', nullable: true })
  details: Record<string, any>;

  @Column({ nullable: true })
  ip: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
