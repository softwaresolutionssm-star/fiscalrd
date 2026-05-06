import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

export enum ServiceOrderStatus {
  PENDING    = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  WAITING_PARTS = 'WAITING_PARTS',
  COMPLETED  = 'COMPLETED',
  DELIVERED  = 'DELIVERED',
  CANCELLED  = 'CANCELLED',
}

export interface ServiceOrderItem {
  productId?: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface VehicleInfo {
  make?: string;
  model?: string;
  year?: string;
  plate?: string;
  mileage?: string;
  color?: string;
}

@Entity('service_orders')
export class ServiceOrder extends BaseEntity {
  @Column() tenantId: string;
  @Column({ type: 'varchar', nullable: true }) branchId: string | null;

  @Column({ unique: false }) orderNumber: string; // SO-2026-0001

  @Column({ type: 'varchar', nullable: true }) customerId: string | null;
  @Column() customerName: string;
  @Column({ type: 'varchar', nullable: true }) customerPhone: string | null;

  @Column({ type: 'jsonb', nullable: true }) vehicleInfo: VehicleInfo | null;
  @Column({ type: 'text' }) problemDescription: string;
  @Column({ type: 'varchar', nullable: true }) internalNotes: string | null;

  @Column({ type: 'enum', enum: ServiceOrderStatus, default: ServiceOrderStatus.PENDING })
  status: ServiceOrderStatus;

  @Column({ type: 'varchar', nullable: true }) assignedEmployeeId: string | null;
  @Column({ type: 'varchar', nullable: true }) assignedEmployeeName: string | null;

  @Column({ type: 'jsonb', default: '[]' }) items: ServiceOrderItem[];

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 }) laborCost: number;
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 }) totalParts: number;
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 }) totalAmount: number;

  @Column({ type: 'date', nullable: true }) estimatedDelivery: Date | null;
  @Column({ type: 'timestamptz', nullable: true }) deliveredAt: Date | null;

  @Column({ type: 'varchar', nullable: true }) saleId: string | null;
}
