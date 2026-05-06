import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

export enum EmployeeStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

@Entity('employees')
export class Employee extends BaseEntity {
  @Column()
  tenantId: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ unique: false, length: 11, nullable: true })
  cedula: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  position: string;

  @Column({ nullable: true })
  department: string;

  @Column('decimal', { precision: 12, scale: 2, nullable: true })
  baseSalary: number;

  @Column({ type: 'date', nullable: true })
  hireDate: Date;

  @Column({ type: 'enum', enum: EmployeeStatus, default: EmployeeStatus.ACTIVE })
  status: EmployeeStatus;

  // Sucursal asignada
  @Column({ type: 'varchar', nullable: true })
  branchId: string | null;

  // Linked system user (optional)
  @Column({ type: 'varchar', nullable: true })
  userId: string | null;

  // Frecuencia de pago para generación automática de nómina
  @Column({ type: 'varchar', length: 10, default: 'MONTHLY' })
  payrollFrequency: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
}
