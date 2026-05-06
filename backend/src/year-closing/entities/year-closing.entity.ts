import { Entity, Column, CreateDateColumn, PrimaryGeneratedColumn } from 'typeorm';

export enum ClosingType {
  BRANCH       = 'branch',       // Cierre de una sucursal específica
  CONSOLIDATED = 'consolidated', // Cierre consolidado de todas las sucursales
}

@Entity('year_closings')
export class YearClosing {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column() tenantId: string;

  @Column({ type: 'varchar', nullable: true })
  branchId: string | null; // null = consolidado

  @Column({ type: 'varchar', nullable: true })
  branchName: string | null;

  @Column({ type: 'int' }) year: number;

  @Column({ type: 'enum', enum: ClosingType, default: ClosingType.BRANCH })
  type: ClosingType;

  // ─── Resumen financiero ────────────────────────────────────────────────────
  @Column('decimal', { precision: 18, scale: 2, default: 0 }) totalSales: number;
  @Column('decimal', { precision: 18, scale: 2, default: 0 }) totalPurchases: number;
  @Column('decimal', { precision: 18, scale: 2, default: 0 }) totalExpenses: number;
  @Column('decimal', { precision: 18, scale: 2, default: 0 }) totalPayroll: number;
  @Column('decimal', { precision: 18, scale: 2, default: 0 }) grossProfit: number;
  @Column('decimal', { precision: 18, scale: 2, default: 0 }) netResult: number;

  // ─── Detalles adicionales (JSON) ──────────────────────────────────────────
  @Column({ type: 'jsonb', nullable: true }) details: Record<string, any> | null;

  @Column({ type: 'varchar' }) closedBy: string;

  @Column({ type: 'text', nullable: true }) notes: string | null;

  @CreateDateColumn({ type: 'timestamptz' }) closedAt: Date;
}
