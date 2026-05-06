import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

export enum ExceptionType {
  HOLIDAY  = 'holiday',   // feriado nacional (precargado)
  CLOSURE  = 'closure',   // cierre especial del negocio
  SPECIAL  = 'special',   // horario especial ese día
}

@Entity('business_exceptions')
export class BusinessException extends BaseEntity {
  @Column() tenantId: string;

  @Column({ type: 'date' })
  date: string; // 'YYYY-MM-DD'

  @Column({ default: true })
  isClosed: boolean;

  @Column({ nullable: true, length: 5 })
  openTime: string;

  @Column({ nullable: true, length: 5 })
  closeTime: string;

  @Column({ nullable: true })
  reason: string; // 'Navidad', 'Inventario anual'

  @Column({ type: 'enum', enum: ExceptionType, default: ExceptionType.HOLIDAY })
  type: ExceptionType;

  @Column({ default: false })
  isNational: boolean; // true = feriado nacional precargado
}
