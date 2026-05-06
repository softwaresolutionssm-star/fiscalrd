import { Entity, Column, CreateDateColumn, PrimaryGeneratedColumn } from 'typeorm';

@Entity('employee_branch_histories')
export class EmployeeBranchHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column() tenantId: string;
  @Column() employeeId: string;

  @Column({ type: 'varchar', nullable: true }) fromBranchId: string | null;
  @Column({ type: 'varchar', nullable: true }) toBranchId: string | null;

  @Column() transferredById: string;
  @Column() transferredByName: string;

  @Column({ type: 'varchar', nullable: true }) notes: string | null;

  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
}
