import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('branches')
export class Branch extends BaseEntity {
  @Column()
  tenantId: string;

  @Column()
  name: string; // Ej: "Sucursal Principal", "Santiago", "La Romana"

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  email: string;

  @Column({ default: false })
  isMain: boolean; // Solo una por tenant

  @Column({ default: true })
  isActive: boolean;
}
