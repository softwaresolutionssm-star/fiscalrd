import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

export enum MovementType {
  IN = 'IN',
  OUT = 'OUT',
  ADJUSTMENT = 'ADJUSTMENT',
}

export enum MovementReason {
  PURCHASE = 'PURCHASE',
  SALE = 'SALE',
  RETURN = 'RETURN',
  DAMAGED = 'DAMAGED',
  MANUAL = 'MANUAL',
  TRANSFER_OUT = 'TRANSFER_OUT',
  TRANSFER_IN = 'TRANSFER_IN',
}

@Entity('inventory_movements')
export class InventoryMovement extends BaseEntity {
  @Column()
  tenantId: string;

  @Column({ type: 'varchar', nullable: true })
  branchId: string | null;

  @Column({ type: 'varchar', nullable: true })
  productId: string | null;

  @Column()
  productName: string;

  @Column({ type: 'enum', enum: MovementType })
  type: MovementType;

  @Column({ type: 'enum', enum: MovementReason, default: MovementReason.MANUAL })
  reason: MovementReason;

  @Column('decimal', { precision: 12, scale: 2 })
  quantity: number;

  @Column('decimal', { precision: 12, scale: 4, nullable: true })
  unitCost: number;

  @Column({ nullable: true })
  reference: string; // saleId, purchaseId, etc.

  @Column({ nullable: true })
  notes: string;

  @Column({ type: 'date' })
  movementDate: Date;

  // Para transferencias entre sucursales
  @Column({ type: 'varchar', nullable: true })
  transferId: string | null; // UUID compartido entre el OUT y el IN

  @Column({ type: 'varchar', nullable: true })
  targetBranchId: string | null; // Solo en TRANSFER_OUT: la sucursal destino
}
