import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

export enum PayrollStatus {
  DRAFT = 'DRAFT',
  APPROVED = 'APPROVED',
  PAID = 'PAID',
}

export enum PayrollType {
  REGULAR = 'REGULAR',
  REGALIA_PASCUAL = 'REGALIA_PASCUAL',
  LIQUIDACION = 'LIQUIDACION',
}

export enum PayrollFrequency {
  WEEKLY    = 'WEEKLY',    // Semanal
  BIWEEKLY  = 'BIWEEKLY', // Quincenal
  MONTHLY   = 'MONTHLY',  // Mensual
}

@Entity('payrolls')
export class Payroll extends BaseEntity {
  @Column()
  tenantId: string;

  @Column({ type: 'varchar', nullable: true })
  branchId: string | null;

  @Column()
  employeeId: string;

  @Column()
  period: string; // ej. "2026-03"

  @Column({ type: 'varchar', length: 10, nullable: true })
  periodStart: string | null; // "YYYY-MM-DD" — sin conversión de timezone

  @Column({ type: 'varchar', length: 10, nullable: true })
  periodEnd: string | null;

  @Column({ type: 'enum', enum: PayrollType, default: PayrollType.REGULAR })
  type: PayrollType;

  @Column({ type: 'enum', enum: PayrollFrequency, default: PayrollFrequency.MONTHLY })
  frequency: PayrollFrequency;

  @Column({ type: 'enum', enum: PayrollStatus, default: PayrollStatus.DRAFT })
  status: PayrollStatus;

  // Ingresos
  @Column({ type: 'decimal', precision: 18, scale: 2 })
  baseSalary: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  overtime: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  bonuses: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  commission: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  grossSalary: number;

  // Deducciones empleado
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  sfsEmployee: number; // 3.04%

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  afpEmployee: number; // 2.87%

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  isr: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  otherDeductions: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  totalDeductions: number;

  // Aportes patronales
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  sfsEmployer: number; // 7.09%

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  afpEmployer: number; // 7.10%

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  srl: number; // 1.20% Seguro de Riesgo Laboral

  // Neto
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  netSalary: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  employerCost: number;

  @Column({ nullable: true })
  notes: string;

  @Column({ nullable: true })
  paidAt: Date;
}
