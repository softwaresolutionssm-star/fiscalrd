import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

export enum ExceptionKind {
  DAY_OFF      = 'day_off',      // día libre puntual
  VACATION     = 'vacation',     // vacaciones
  SICK         = 'sick',         // enfermedad
  PERMISSION   = 'permission',   // permiso personal
  EXTRA        = 'extra',        // trabaja en día libre (+35%)
  HOLIDAY      = 'holiday',      // feriado que afecta al empleado
  HOLIDAY_WORK = 'holiday_work', // trabaja en feriado (+100%)
  SUSPENSION   = 'suspension',   // suspensión disciplinaria (sin goce)
  MATERNITY    = 'maternity',    // licencia maternidad (14 semanas)
  PATERNITY    = 'paternity',    // licencia paternidad (2 días)
}

@Entity('employee_schedule_exceptions')
export class EmployeeScheduleException extends BaseEntity {
  @Column() tenantId: string;
  @Column() employeeId: string;
  @Column() employeeName: string; // desnormalizado para queries rápidas

  @Column({ type: 'date' })
  dateFrom: string; // 'YYYY-MM-DD'

  @Column({ type: 'date' })
  dateTo: string;   // igual a dateFrom si es un solo día

  @Column({ type: 'enum', enum: ExceptionKind })
  kind: ExceptionKind;

  @Column({ nullable: true, length: 5 })
  startTime: string; // si es horario diferente ese día

  @Column({ nullable: true, length: 5 })
  endTime: string;

  @Column({ default: true })
  paid: boolean; // con goce de sueldo

  @Column({ nullable: true })
  approvedBy: string; // nombre del admin que aprobó

  @Column({ nullable: true })
  notes: string;
}
