'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { toast } from 'sonner';
import { PageHeader } from '@/components/ui/page-header';
import {
  Building2, Users, ShoppingCart, CheckCircle,
  TrendingUp, DollarSign, Plus, Activity, Settings,
  BarChart2, Clock, CreditCard, AlertTriangle, Bell, Lock, LockOpen,
} from 'lucide-react';

interface AdminStats {
  totalTenants: number;
  activeTenants: number;
  totalUsers: number;
  totalSales: number;
  mrr: number;
}

interface LockedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  tenantName: string;
  loginAttempts: number;
}

interface BillingAlert {
  id?: string;
  tenantId: string;
  businessName: string;
  plan: string;
  period: string;
  totalAmount: number;
  status: string;
  submittedAt?: string | null;
  dueDate?: string;
  isBillingBlocked?: boolean;
  branchId?: string | null;
  branchName?: string | null;
}

interface TenantMetric {
  id: string;
  businessName: string;
  businessType: string;
  plan: string;
  isActive: boolean;
  createdAt: string;
  userCount: number;
  activeUsers: number;
  saleCount: number;
  totalRevenue: number;
  lastActivityAt: string | null;
}

const PLAN_COLORS: Record<string, string> = {
  free:       'bg-slate-100 text-slate-600',
  basic:      'bg-blue-100 text-blue-700',
  pro:        'bg-purple-100 text-purple-700',
  enterprise: 'bg-amber-100 text-amber-700',
};
const PLAN_LABELS: Record<string, string> = {
  free: 'Gratis', basic: 'Básico', pro: 'Pro', enterprise: 'Empresarial',
};
const BUSINESS_EMOJI: Record<string, string> = {
  ferreteria: '🔧', colmado: '🛒', supermercado: '🏪', farmacia: '💊',
  restaurante: '🍽️', ropa: '👗', salon: '💇', taller: '🚗',
  tecnologia: '💻', servicios: '🏢', constructora: '🏗️', importadora: '📦',
  consultorio: '🏥', educacion: '🎓', hotel: '🏨', transporte: '🚛',
  agropecuario: '🌾', bar: '🍺', joyeria: '💍', panaderia: '🥖', otro: '🏬',
};

function timeAgo(dateStr: string | null) {
  if (!dateStr) return 'Sin actividad';
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Hoy';
  if (days === 1) return 'Ayer';
  if (days < 7) return `Hace ${days} días`;
  if (days < 30) return `Hace ${Math.floor(days / 7)} semanas`;
  return `Hace ${Math.floor(days / 30)} meses`;
}

// Simple bar chart for plan distribution
function PlanBar({ counts, total }: { counts: Record<string, number>; total: number }) {
  const plans = [
    { key: 'enterprise', color: 'bg-amber-400', label: 'Empresarial' },
    { key: 'pro',        color: 'bg-purple-400', label: 'Pro' },
    { key: 'basic',      color: 'bg-blue-400',   label: 'Básico' },
    { key: 'free',       color: 'bg-slate-300',  label: 'Gratis' },
  ];
  return (
    <div>
      <div className="flex h-4 rounded-full overflow-hidden gap-0.5">
        {plans.map(p => {
          const pct = total > 0 ? (counts[p.key] ?? 0) / total * 100 : 0;
          if (pct === 0) return null;
          return (
            <div
              key={p.key}
              className={`${p.color} transition-all`}
              style={{ width: `${pct}%` }}
              title={`${p.label}: ${counts[p.key] ?? 0}`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-3 mt-2">
        {plans.map(p => (
          <div key={p.key} className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className={`w-2.5 h-2.5 rounded-full ${p.color}`} />
            {p.label}: <strong className="text-slate-700">{counts[p.key] ?? 0}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function fmtMoney(n: number) {
  return `RD$${Number(n).toLocaleString('es-DO', { minimumFractionDigits: 0 })}`;
}
function fmtDate(d?: string | null) {
  if (!d) return '—';
  return new Date(d.includes('T') ? d : d + 'T12:00:00').toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [metrics, setMetrics] = useState<TenantMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'saleCount' | 'totalRevenue' | 'userCount' | 'lastActivityAt'>('saleCount');
  const [toReview, setToReview] = useState<BillingAlert[]>([]);
  const [overdue, setOverdue] = useState<BillingAlert[]>([]);
  const [lockedUsers, setLockedUsers] = useState<LockedUser[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const statsRes = await api.get('/admin/stats');
        setStats(statsRes.data.data ?? statsRes.data);
      } catch (e: any) {
        toast.error(`Error cargando estadísticas: ${e?.response?.data?.message ?? e?.message}`);
      }

      try {
        const metricsRes = await api.get('/admin/metrics/tenants');
        setMetrics(metricsRes.data.data ?? metricsRes.data);
      } catch (e: any) {
        toast.error(`Error cargando métricas: ${e?.response?.data?.message ?? e?.message}`);
      }

      try {
        const lockedRes = await api.get('/admin/users/locked');
        const locked = lockedRes.data.data ?? lockedRes.data ?? [];
        setLockedUsers(Array.isArray(locked) ? locked : []);
      } catch (e: any) {
        console.error('Error cargando usuarios bloqueados:', e?.response?.data ?? e?.message);
      }

      try {
        const [submittedRes, overdueRes, pendingRes] = await Promise.all([
          api.get('/billing/admin/payments?status=submitted'),
          api.get('/billing/admin/payments?status=overdue'),
          api.get('/billing/admin/payments?status=pending'),
        ]);
        setToReview(submittedRes.data.data ?? submittedRes.data ?? []);
        // Combinar overdue + pending vencidos (dueDate pasado)
        const now = new Date();
        const overdueList = overdueRes.data.data ?? overdueRes.data ?? [];
        const pendingList = (pendingRes.data.data ?? pendingRes.data ?? []) as BillingAlert[];
        const pendingPastDue = pendingList.filter(p => p.dueDate && new Date(p.dueDate) < now);
        setOverdue([...overdueList, ...pendingPastDue]);
      } catch { /* ignore */ }

      setLoading(false);
    }
    load();
  }, []);

  const planCounts = metrics.reduce((acc, t) => {
    acc[t.plan] = (acc[t.plan] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sorted = [...metrics].sort((a, b) => {
    if (sortBy === 'lastActivityAt') {
      const da = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0;
      const db = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0;
      return db - da;
    }
    return (b[sortBy] as number) - (a[sortBy] as number);
  });

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Panel de Administración"
        description="Visión general de la plataforma"
        action={
          <Link
            href="/admin/tenants/new"
            className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
          >
            <Plus size={15} /> Nuevo Negocio
          </Link>
        }
      />

      {/* ─── Stats Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4 mb-6">
        <StatCard label="Total Negocios" value={stats?.totalTenants ?? 0}
          icon={Building2} iconColor="text-red-600" iconBg="bg-red-50"
          sub={`${stats?.activeTenants ?? 0} activos`} />
        <StatCard label="Negocios Activos" value={stats?.activeTenants ?? 0}
          icon={CheckCircle} iconColor="text-green-600" iconBg="bg-green-50"
          sub={`${((stats?.activeTenants ?? 0) / Math.max(stats?.totalTenants ?? 1, 1) * 100).toFixed(0)}% del total`} />
        <StatCard label="Total Usuarios" value={stats?.totalUsers ?? 0}
          icon={Users} iconColor="text-blue-600" iconBg="bg-blue-50"
          sub="en la plataforma" />
        <StatCard label="Facturas Emitidas" value={stats?.totalSales ?? 0}
          icon={ShoppingCart} iconColor="text-purple-600" iconBg="bg-purple-50"
          sub="total histórico" />
        <StatCard
          label="MRR Estimado"
          value={`RD$${(stats?.mrr ?? 0).toLocaleString('es-DO', { minimumFractionDigits: 0 })}`}
          icon={DollarSign} iconColor="text-amber-600" iconBg="bg-amber-50"
          sub="ingresos mensuales" />
      </div>

      {/* ─── Locked Users ────────────────────────────────────── */}
      {lockedUsers.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-orange-200 p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <Lock size={16} className="text-orange-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-800">Cuentas Bloqueadas</h3>
                <p className="text-xs text-slate-400">{lockedUsers.length} usuario{lockedUsers.length !== 1 ? 's' : ''} bloqueado{lockedUsers.length !== 1 ? 's' : ''} por intentos fallidos</p>
              </div>
            </div>
            <span className="bg-orange-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">{lockedUsers.length}</span>
          </div>
          <div className="space-y-2">
            {lockedUsers.map(u => (
              <div key={u.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-slate-800">{u.firstName} {u.lastName}</p>
                  <p className="text-xs text-slate-400">{u.email} · {u.tenantName}</p>
                </div>
                <button
                  onClick={async () => {
                    try {
                      await api.patch(`/users/${u.id}/unlock`);
                      toast.success(`Cuenta de ${u.firstName} desbloqueada`);
                      setLockedUsers(prev => prev.filter(x => x.id !== u.id));
                    } catch { toast.error('Error al desbloquear'); }
                  }}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg font-medium transition-colors"
                >
                  <LockOpen size={12} /> Desbloquear
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Billing Alerts ──────────────────────────────────── */}
      {(toReview.length > 0 || overdue.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">

          {/* Comprobantes por revisar */}
          {toReview.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="bg-blue-50 p-2 rounded-lg">
                    <Bell size={16} className="text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">Comprobantes por Aprobar</h3>
                    <p className="text-xs text-slate-400">{toReview.length} pago{toReview.length !== 1 ? 's' : ''} esperando revisión</p>
                  </div>
                </div>
                <span className="bg-blue-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">{toReview.length}</span>
              </div>
              <div className="space-y-2">
                {toReview.slice(0, 4).map(p => (
                  <div key={p.id ?? p.tenantId + p.period + (p.branchId ?? '')} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {p.businessName}
                        {p.branchName && <span className="text-slate-400 font-normal"> · {p.branchName}</span>}
                      </p>
                      <p className="text-xs text-slate-400">Período {p.period} · {p.submittedAt ? `Enviado ${fmtDate(p.submittedAt)}` : ''}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-800">{fmtMoney(p.totalAmount)}</p>
                    </div>
                  </div>
                ))}
                {toReview.length > 4 && (
                  <p className="text-xs text-slate-400 text-center pt-1">+{toReview.length - 4} más</p>
                )}
              </div>
              <Link href="/admin/facturacion" className="mt-3 flex items-center justify-center gap-2 w-full bg-blue-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-blue-700 transition-colors">
                <CreditCard size={14} /> Ir a revisar pagos
              </Link>
            </div>
          )}

          {/* Vencidos / morosos */}
          {overdue.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-red-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="bg-red-50 p-2 rounded-lg">
                    <AlertTriangle size={16} className="text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">Pagos Vencidos</h3>
                    <p className="text-xs text-slate-400">{overdue.length} negocio{overdue.length !== 1 ? 's' : ''} con mora</p>
                  </div>
                </div>
                <span className="bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">{overdue.length}</span>
              </div>
              <div className="space-y-2">
                {overdue.slice(0, 4).map(p => (
                  <div key={p.id ?? p.tenantId + p.period + (p.branchId ?? '')} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {p.businessName}
                        {p.branchName && <span className="text-slate-400 font-normal"> · {p.branchName}</span>}
                      </p>
                      <p className="text-xs text-red-400">Venció {fmtDate(p.dueDate)} · Período {p.period}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-red-700">{fmtMoney(p.totalAmount)}</p>
                      {p.isBillingBlocked && (
                        <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium">Bloqueado</span>
                      )}
                    </div>
                  </div>
                ))}
                {overdue.length > 4 && (
                  <p className="text-xs text-slate-400 text-center pt-1">+{overdue.length - 4} más</p>
                )}
              </div>
              <Link href="/admin/facturacion" className="mt-3 flex items-center justify-center gap-2 w-full bg-red-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-red-700 transition-colors">
                <AlertTriangle size={14} /> Ver morosos
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ─── Plan Distribution Chart ──────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 mb-6">
        <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-4">
          <BarChart2 size={16} className="text-slate-400" />
          Distribución por Plan
        </h2>
        <PlanBar counts={planCounts} total={metrics.length} />
      </div>

      {/* ─── Quick Actions ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Crear Negocio', href: '/admin/tenants/new',  icon: Plus,      color: 'bg-red-600 text-white hover:bg-red-700' },
          { label: 'Ver Negocios',  href: '/admin/tenants',      icon: Building2, color: 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50' },
          { label: 'Ver Usuarios',  href: '/admin/users',        icon: Users,     color: 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50' },
          { label: 'Configuración', href: '/admin/settings',     icon: Settings,  color: 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50' },
        ].map(({ label, href, icon: Icon, color }) => (
          <Link key={href} href={href}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-colors shadow-sm ${color}`}>
            <Icon size={16} />
            {label}
          </Link>
        ))}
      </div>

      {/* ─── Per-Tenant Metrics ───────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <Activity size={16} className="text-slate-400" />
            Métricas por Negocio
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Ordenar por:</span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as typeof sortBy)}
              className="text-xs border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-red-500/30"
            >
              <option value="saleCount">Ventas</option>
              <option value="totalRevenue">Ingresos</option>
              <option value="userCount">Usuarios</option>
              <option value="lastActivityAt">Actividad reciente</option>
            </select>
            <Link href="/admin/tenants" className="text-sm text-red-600 hover:underline ml-2">
              Ver todos →
            </Link>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <th className="px-5 py-3 text-left font-medium">Negocio</th>
                <th className="px-5 py-3 text-left font-medium">Plan</th>
                <th className="px-5 py-3 text-right font-medium">Usuarios</th>
                <th className="px-5 py-3 text-right font-medium">Activos</th>
                <th className="px-5 py-3 text-right font-medium">Ventas</th>
                <th className="px-5 py-3 text-right font-medium">Ingresos Total</th>
                <th className="px-5 py-3 text-left font-medium">Última Actividad</th>
                <th className="px-5 py-3 text-center font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sorted.length === 0 && (
                <tr><td colSpan={8} className="px-6 py-10 text-center text-slate-400">
                  No hay negocios — <Link href="/admin/tenants/new" className="text-red-600 hover:underline">Crear el primero</Link>
                </td></tr>
              )}
              {sorted.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{BUSINESS_EMOJI[t.businessType] ?? '🏬'}</span>
                      <div>
                        <p className="font-medium text-slate-800">{t.businessName}</p>
                        <p className="text-xs text-slate-400 capitalize">{t.businessType?.replace(/_/g, ' ')}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PLAN_COLORS[t.plan] ?? 'bg-slate-100 text-slate-600'}`}>
                      {PLAN_LABELS[t.plan] ?? t.plan}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right text-slate-700 font-medium">{t.userCount}</td>
                  <td className="px-5 py-3 text-right">
                    <span className="text-green-700 font-medium">{t.activeUsers}</span>
                    {t.userCount > 0 && (
                      <span className="text-xs text-slate-400 ml-1">
                        ({Math.round(t.activeUsers / t.userCount * 100)}%)
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right text-slate-700 font-medium">{t.saleCount.toLocaleString('es-DO')}</td>
                  <td className="px-5 py-3 text-right">
                    <span className="font-semibold text-slate-800">
                      RD${t.totalRevenue.toLocaleString('es-DO', { minimumFractionDigits: 0 })}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Clock size={12} />
                      {timeAgo(t.lastActivityAt)}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${t.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {t.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Growth trend note */}
        {metrics.length > 0 && (
          <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center gap-2 text-xs text-slate-500">
            <TrendingUp size={13} className="text-green-500" />
            {metrics.filter(t => {
              const d = new Date(t.createdAt);
              const now = new Date();
              return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            }).length} nuevo{metrics.filter(t => {
              const d = new Date(t.createdAt);
              const now = new Date();
              return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            }).length !== 1 ? 's' : ''} negocio{metrics.filter(t => {
              const d = new Date(t.createdAt);
              const now = new Date();
              return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            }).length !== 1 ? 's' : ''} este mes
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, iconColor, iconBg, sub }: {
  label: string; value: string | number; icon: any;
  iconColor: string; iconBg: string; sub?: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 flex items-center gap-4">
      <div className={`${iconBg} p-3 rounded-lg flex-shrink-0`}>
        <Icon className={iconColor} size={20} />
      </div>
      <div>
        <p className="text-xs text-slate-500 mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-slate-800">{typeof value === 'number' ? value.toLocaleString('es-DO') : value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}
