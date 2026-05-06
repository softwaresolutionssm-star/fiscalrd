import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

export enum CashEntryType {
  EXPENSE    = 'EXPENSE',    // Gasto con justificación (papel, luz, café)
  WITHDRAWAL = 'WITHDRAWAL', // Retiro del dueño sin justificación
  INCOME     = 'INCOME',     // Ingreso extra que no es venta (devolución proveedor, etc.)
}

@Entity('cash_register_expenses')
export class CashRegisterExpense extends BaseEntity {
  @Column() tenantId: string;
  @Column() sessionId: string;

  @Column({ type: 'enum', enum: CashEntryType, default: CashEntryType.EXPENSE })
  type: CashEntryType;

  @Column({ type: 'decimal', precision: 18, scale: 2 }) amount: number;
  @Column() description: string;
  @Column({ nullable: true, default: 'GENERAL' }) category: string;
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) expenseAt: Date;
}
