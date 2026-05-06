import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

export enum AppointmentStatus {
  PENDING    = 'PENDING',
  CONFIRMED  = 'CONFIRMED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED  = 'COMPLETED',
  CANCELLED  = 'CANCELLED',
  NO_SHOW    = 'NO_SHOW',
}

@Entity('appointments')
export class Appointment extends BaseEntity {
  @Column() tenantId: string;
  @Column({ type: 'varchar', nullable: true }) branchId: string | null;

  @Column({ nullable: true }) customerId: string;
  @Column() customerName: string;
  @Column({ nullable: true }) customerPhone: string;
  @Column({ nullable: true }) customerEmail: string;

  @Column({ nullable: true }) employeeId: string;
  @Column({ nullable: true }) employeeName: string; // snapshot

  @Column() serviceName: string;
  @Column({ type: 'int', default: 60 }) durationMinutes: number;
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0, nullable: true }) servicePrice: number;

  @Column({ type: 'varchar', length: 10 }) appointmentDate: string; // YYYY-MM-DD
  @Column({ type: 'varchar', length: 5 }) startTime: string; // HH:mm
  @Column({ type: 'varchar', length: 5, nullable: true }) endTime: string; // HH:mm

  @Column({ type: 'enum', enum: AppointmentStatus, default: AppointmentStatus.PENDING })
  status: AppointmentStatus;

  @Column({ nullable: true }) notes: string;
  @Column({ nullable: true }) cancelReason: string;
  @Column({ unique: false, nullable: true }) publicToken: string; // for public cancel link
}
