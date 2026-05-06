import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('business_hours')
export class BusinessHour extends BaseEntity {
  @Column() tenantId: string;

  @Column({ type: 'int' })
  dayOfWeek: number; // 0=domingo 1=lunes ... 6=sábado

  @Column({ default: true })
  isOpen: boolean;

  @Column({ nullable: true, length: 5 })
  openTime: string; // '08:00'

  @Column({ nullable: true, length: 5 })
  closeTime: string; // '17:00'

  @Column({ default: false })
  hasBreak: boolean; // cierre al mediodía

  @Column({ nullable: true, length: 5 })
  breakStart: string; // '12:00'

  @Column({ nullable: true, length: 5 })
  breakEnd: string; // '14:00'

  @Column({ default: false })
  is24Hours: boolean;
}
