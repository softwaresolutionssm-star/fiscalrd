import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

export enum SessionStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
}

@Entity('cash_register_sessions')
export class CashRegisterSession extends BaseEntity {
  @Column() tenantId: string;

  @Column({ type: 'varchar', nullable: true })
  branchId: string | null;

  @Column() openedById: string;
  @Column() openedByName: string;

  @Column({ nullable: true }) closedById: string;
  @Column({ nullable: true }) closedByName: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  initialAmount: number;          // Monto inicial declarado al abrir

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  totalCashSales: number;         // Ventas cobradas en efectivo

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  totalCardSales: number;         // Ventas cobradas con tarjeta

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  totalTransferSales: number;     // Ventas por transferencia

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  totalSales: number;             // Total de ventas del turno

  @Column({ type: 'int', default: 0 })
  saleCount: number;              // Cantidad de ventas

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  totalExpenses: number;          // Gastos de caja (egresos con justificación)

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  totalWithdrawals: number;       // Retiros del dueño (sin justificación)

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  totalExtraIncome: number;       // Ingresos extras (devolución proveedor, ingreso manual)

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  totalFiadoCollections: number;  // Cobros de fiado en efectivo durante el turno

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  expectedCash: number;           // Efectivo esperado al cierre

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  actualCash: number;             // Efectivo físico contado al cierre

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  cashDifference: number;         // Diferencia (actual - expected)

  @Column({
    type: 'enum',
    enum: SessionStatus,
    default: SessionStatus.OPEN,
  })
  status: SessionStatus;

  @Column({ nullable: true }) notes: string;

  @Column({ type: 'timestamp' }) openedAt: Date;
  @Column({ type: 'timestamp', nullable: true }) closedAt: Date;
}
