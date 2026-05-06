import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('notifications')
export class Notification extends BaseEntity {
  @Column()
  tenantId: string;

  @Column()
  type: string; // 'info' | 'warning' | 'success' | 'error'

  @Column()
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ nullable: true })
  link: string; // optional deep-link

  @Column({ default: false })
  read: boolean;
}
