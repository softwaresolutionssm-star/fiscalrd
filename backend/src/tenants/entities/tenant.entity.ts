import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { TenantPlan } from '../../common/enums/plan.enum';
import { BusinessType } from '../../common/enums/business-type.enum';

@Entity('tenants')
export class Tenant extends BaseEntity {
  @Column()
  businessName: string;

  @Column({ unique: true, length: 9 })
  rnc: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  email: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  logoUrl: string;

  @Column({ nullable: true })
  website: string;

  // ─── Tipo de Negocio ──────────────────────────────────────────────
  @Column({ type: 'varchar', default: BusinessType.OTRO })
  businessType: BusinessType;

  // ─── Plan / Suscripción ───────────────────────────────────────────
  @Column({ type: 'varchar', default: TenantPlan.FREE })
  plan: TenantPlan;

  @Column({ nullable: true })
  planExpiresAt: Date;

  @Column({ nullable: true })
  subscriptionStartDate: Date;

  @Column({ nullable: true })
  subscriptionEndDate: Date;

  @Column({ type: 'varchar', default: 'trial', nullable: true })
  subscriptionStatus: string; // active | trial | expired | cancelled

  // ─── Caja ─────────────────────────────────────────────────────────
  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  cashFund: number; // Fondo de apertura de caja configurado por el admin/dueño

  // ─── Alanube (e-CF / DGII) ────────────────────────────────────────
  @Column({ nullable: true })
  alanubeApiKey: string;

  @Column({ default: true })
  alanubeSandbox: boolean;

  @Column({ nullable: true })
  dgiiCertificateId: string;

  @Column({ default: 0 })
  ecfSequence: number;

  // ─── Facturación FiscalRD ─────────────────────────────────────────────────
  @Column({ default: false })
  isBillingBlocked: boolean; // Bloqueado por falta de pago

  @Column({ default: 1 })
  billingCutoffDay: number; // Día del mes en que se genera la factura (1 = día 1)

  // ─── Plan de Sucursales ───────────────────────────────────────────────────
  @Column({ default: 1 })
  maxBranches: number; // Máximo de sucursales permitidas según el plan contratado

  @Column({ type: 'text', nullable: true })
  billingNotes: string | null; // Notas internas sobre facturación

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  billingDiscountPct: number; // % de descuento aplicado por el superadmin (0 = sin descuento)
}
