import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { SaleItem } from './sale-item.entity';
import { NcfType } from '../../common/enums/ncf-type.enum';

export enum SaleStatus {
  DRAFT = 'draft',
  ISSUED = 'issued',
  CANCELLED = 'cancelled',
}

@Entity('sales')
export class Sale extends BaseEntity {
  @Column()
  tenantId: string;

  @Column({ type: 'varchar', nullable: true })
  branchId: string | null;

  @Column({ nullable: true })
  customerId: string;

  @Column({ nullable: true })
  customerName: string;

  @Column({ nullable: true })
  customerRncCedula: string;

  @Column({ type: 'varchar', length: 10, default: NcfType.E32 })
  ncfType: NcfType;

  @Column({ nullable: true })
  ncfNumber: string; // e.g. B0100000001

  @Column({ type: 'enum', enum: SaleStatus, default: SaleStatus.DRAFT })
  status: SaleStatus;

  @Column({ type: 'date' })
  saleDate: Date;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  subtotal: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  itbisTotal: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  total: number;

  @Column({ nullable: true, default: 'cash' })
  paymentMethod: string; // cash | card | transfer | credit

  @Column({ type: 'date', nullable: true })
  dueDate: Date; // for credit sales

  @Column({ nullable: true })
  notes: string;

  @Column({ type: 'jsonb', nullable: true })
  paymentSplits: Array<{ method: string; amount: number }> | null; // pago mixto

  @Column({ nullable: true })
  relatedNcf: string; // NCF of original sale (for E34 credit notes)

  @Column({ nullable: true })
  cashRegisterSessionId: string; // Sesión de caja en la que se emitió

  // ─── e-CF / Alanube / DGII ───────────────────────────────────────────────
  @Column({ type: 'varchar', nullable: true })
  trackId: string | null;

  @Column({ type: 'varchar', default: 'NO_ENVIADO' })
  dgiiStatus: string; // NO_ENVIADO | PENDIENTE | ACEPTADO | RECHAZADO

  @Column({ type: 'timestamptz', nullable: true })
  alanubeSentAt: Date | null;

  @Column({ type: 'varchar', nullable: true })
  securityCode: string | null; // Código de Seguridad DGII

  @Column({ type: 'timestamptz', nullable: true })
  signatureDate: Date | null; // Fecha de Firma Digital

  @OneToMany(() => SaleItem, (item) => item.sale, { cascade: true, eager: true })
  items: SaleItem[];
}
