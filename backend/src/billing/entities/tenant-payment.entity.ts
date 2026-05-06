import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum PaymentStatus {
  PENDING   = 'pending',    // Generado, esperando pago del negocio
  SUBMITTED = 'submitted',  // Negocio subió comprobante, esperando aprobación
  APPROVED  = 'approved',   // Aprobado por Saul
  REJECTED  = 'rejected',   // Rechazado por Saul (con razón)
  OVERDUE   = 'overdue',    // Vencido (más de 7 días)
  WAIVED    = 'waived',     // Saul lo perdonó manualmente
}

@Entity('tenant_payments')
export class TenantPayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  // Null = pago consolidado legacy (una sucursal). String = pago por sucursal específica.
  @Column({ type: 'varchar', nullable: true })
  branchId: string | null;

  @Column({ type: 'varchar', nullable: true })
  branchName: string | null;

  @Column()
  period: string; // 'YYYY-MM', ej: '2026-03'

  // ─── Montos ─────────────────────────────────────────────────────────────────
  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  baseAmount: number; // Precio del plan

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  lateFeePercent: number; // 0 o 10

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  lateFeeAmount: number; // baseAmount * lateFeePercent / 100

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  totalAmount: number; // baseAmount + lateFeeAmount

  // ─── Fechas ─────────────────────────────────────────────────────────────────
  @Column({ type: 'date' })
  dueDate: Date; // Fecha límite de pago

  @Column({ type: 'varchar', default: PaymentStatus.PENDING })
  status: PaymentStatus;

  // ─── Comprobante del negocio ─────────────────────────────────────────────────
  @Column({ type: 'timestamptz', nullable: true })
  submittedAt: Date | null;

  @Column({ type: 'varchar', nullable: true })
  bankName: string | null; // "Banco Popular", "BHD León", "Banreservas", etc.

  @Column({ type: 'varchar', nullable: true })
  referenceNumber: string | null; // Número de referencia de la transferencia

  @Column('decimal', { precision: 12, scale: 2, nullable: true })
  transferAmount: number | null;

  @Column({ type: 'text', nullable: true })
  proofNotes: string | null; // Notas del pago

  @Column({ type: 'varchar', nullable: true })
  proofUrl: string | null; // URL de imagen del comprobante (opcional)

  // ─── Acción del admin ───────────────────────────────────────────────────────
  @Column({ type: 'timestamptz', nullable: true })
  approvedAt: Date | null;

  @Column({ type: 'varchar', nullable: true })
  approvedBy: string | null; // nombre del admin

  @Column({ type: 'timestamptz', nullable: true })
  rejectedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  rejectedReason: string | null;

  @Column({ type: 'text', nullable: true })
  adminNotes: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
