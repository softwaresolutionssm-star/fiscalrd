import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

export enum VacationRequestStatus {
  PENDING  = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('vacation_requests')
export class VacationRequest extends BaseEntity {
  @Column() tenantId: string;
  @Column({ type: 'varchar', nullable: true }) branchId: string | null;
  @Column() employeeId: string;
  @Column() employeeName: string;

  @Column({ type: 'date' }) dateFrom: string;
  @Column({ type: 'date' }) dateTo: string;

  @Column({ nullable: true }) notes: string;

  @Column({ type: 'enum', enum: VacationRequestStatus, default: VacationRequestStatus.PENDING })
  status: VacationRequestStatus;

  @Column({ nullable: true }) reviewedBy: string;
  @Column({ type: 'text', nullable: true }) reviewNote: string | null;
  @Column({ type: 'timestamptz', nullable: true }) reviewedAt: Date;
}
