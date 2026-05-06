import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Exclude } from 'class-transformer';
import { BaseEntity } from '../../common/entities/base.entity';
import { UserRole } from '../../common/enums/roles.enum';

@Entity('users')
export class User extends BaseEntity {
  @Column({ unique: true })
  email: string;

  @Column()
  @Exclude()
  password: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.CASHIER })
  role: UserRole;

  @Column({ nullable: true })
  tenantId: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'varchar', nullable: true })
  resetPasswordToken: string | null;

  @Column({ type: 'timestamp', nullable: true })
  resetPasswordExpires: Date | null;

  // Fondo asignado por el admin/owner para el próximo turno
  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  pendingCashFund: number | null;

  @Column({ type: 'varchar', nullable: true })
  pendingCashFundNote: string | null;

  @Column({ type: 'varchar', nullable: true })
  pendingCashFundBy: string | null; // nombre del admin que asignó

  @Column({ default: false })
  twoFactorEnabled: boolean;

  @Column({ type: 'varchar', nullable: true })
  @Exclude()
  twoFactorSecret: string | null;

  // Sucursal asignada (null = acceso a todas)
  @Column({ type: 'varchar', nullable: true })
  branchId: string | null;

  // Account lockout
  @Column({ default: 0 })
  loginAttempts: number;

  @Column({ default: false })
  isLocked: boolean;

  // Permisos extra otorgados por owner/admin (ej. para managers)
  // Valores posibles: 'manage_users', 'reset_passwords'
  @Column({ type: 'simple-array', nullable: true, default: null })
  permissions: string[] | null;
}
