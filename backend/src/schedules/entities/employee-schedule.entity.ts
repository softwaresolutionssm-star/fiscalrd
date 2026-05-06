import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import type { WeekSchedule } from './schedule-template.entity';

@Entity('employee_schedules')
export class EmployeeSchedule extends BaseEntity {
  @Column() tenantId: string;
  @Column({ type: 'varchar', nullable: true }) branchId: string | null;
  @Column() employeeId: string;

  @Column({ nullable: true })
  templateId: string; // si usa plantilla

  @Column({ type: 'date' })
  effectiveFrom: string; // 'YYYY-MM-DD' — desde cuándo aplica

  @Column({ type: 'date', nullable: true })
  effectiveTo: string | null; // null = indefinido

  @Column({ type: 'jsonb' })
  scheduleData: WeekSchedule;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 44 })
  weeklyHours: number;

  @Column({ type: 'int', default: 60 })
  lunchMinutes: number; // minutos de almuerzo (no cuentan)

  @Column({ nullable: true })
  notes: string;
}
