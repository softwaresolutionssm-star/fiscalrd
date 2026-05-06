import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

// Estructura del JSON scheduleData:
// {
//   monday:    { isWorking: true,  blocks: [{ start: '08:00', end: '17:00' }] },
//   tuesday:   { isWorking: true,  blocks: [{ start: '08:00', end: '12:00' }, { start: '14:00', end: '18:00' }] },
//   wednesday: { isWorking: false, blocks: [] },
//   ...
// }

export interface DayBlock { start: string; end: string; }
export interface DaySchedule { isWorking: boolean; blocks: DayBlock[]; }
export interface WeekSchedule {
  monday: DaySchedule; tuesday: DaySchedule; wednesday: DaySchedule;
  thursday: DaySchedule; friday: DaySchedule; saturday: DaySchedule; sunday: DaySchedule;
}

export const EMPTY_DAY: DaySchedule = { isWorking: false, blocks: [] };
export const WORK_DAY = (start = '08:00', end = '17:00'): DaySchedule => ({
  isWorking: true, blocks: [{ start, end }],
});

@Entity('schedule_templates')
export class ScheduleTemplate extends BaseEntity {
  @Column() tenantId: string;

  @Column() name: string; // 'Turno Completo L-V'

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'jsonb' })
  scheduleData: WeekSchedule;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  weeklyHours: number; // horas semanales esperadas
}
