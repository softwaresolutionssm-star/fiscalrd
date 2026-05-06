import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

export enum TableStatus {
  AVAILABLE = 'AVAILABLE',
  OCCUPIED  = 'OCCUPIED',
  RESERVED  = 'RESERVED',
}

@Entity('restaurant_tables')
export class RestaurantTable extends BaseEntity {
  @Column() tenantId: string;
  @Column({ type: 'varchar', nullable: true }) branchId: string | null;
  @Column() name: string; // "Mesa 1", "Barra", "Terraza 3"
  @Column({ type: 'int', default: 4 }) capacity: number;
  @Column({ type: 'enum', enum: TableStatus, default: TableStatus.AVAILABLE }) status: TableStatus;
  @Column({ type: 'varchar', nullable: true }) currentOrderId: string | null;
  @Column({ nullable: true }) notes: string; // "Junto a la ventana", "Reservada para evento"
}
