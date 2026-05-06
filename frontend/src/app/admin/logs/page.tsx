'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { PageHeader } from '@/components/ui/page-header';
import { toast } from 'sonner';
import { Activity, Building2, Users, Settings, ShoppingCart, RefreshCw } from 'lucide-react';

interface LogEntry {
  id: string;
  action: string;
  entityType: string;
  entityName: string;
  performedBy: string;
  details?: string;
  createdAt: string;
}

// Since backend logs aren't built yet, we show tenant/user activity from the data we have
interface TenantSummary {
  id: string;
  businessName: string;
  businessType: string;
  plan: string;
  isActive: boolean;
  userCount: number;
  saleCount: number;
  createdAt: string;
}

const BUSINESS_EMOJI: Record<string, string> = {
  ferreteria: '🔧', colmado: '🛒', supermercado: '🏪', farmacia: '💊',
  restaurante: '🍽️', ropa: '👗', salon: '💇', taller: '🚗',
  tecnologia: '💻', servicios: '🏢', constructora: '🏗️', importadora: '📦',
  consultorio: '🏥', educacion: '🎓', hotel: '🏨', transporte: '🚛',
  agropecuario: '🌾', bar: '🍺', joyeria: '💍', panaderia: '🥖', otro: '🏬',
};

const PLAN_COLORS: Record<string, string> = {
  free: 'bg-slate-100 text-slate-600', basic: 'bg-blue-100 text-blue-700',
  pro: 'bg-purple-100 text-purple-700', enterprise: 'bg-amber-100 text-amber-700',
};
const PLAN_LABELS: Record<string, string> = {
  free: 'Gratis', basic: 'Básico', pro: 'Pro', enterprise: 'Empresarial',
};

export default function AdminLogsPage() {
  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      const [tenantsRes, statsRes] = await Promise.all([
        api.get('/admin/tenants'),
        api.get('/admin/stats'),
      ]);
      const all: TenantSummary[] = tenantsRes.data.data ?? tenantsRes.data;
      setTenants([...all].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
      setStats(statsRes.data.data ?? statsRes.data);
    } catch {
      toast.error('Error cargando actividad');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  const refresh = () => { setRefreshing(true); load(); };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
    </div>
  );

  // Group tenants by day
  const grouped: Record<string, TenantSummary[]> = {};
  tenants.forEach(t => {
    const day = new Intl.DateTimeFormat('es-DO', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/Santo_Domingo',
    }).format(new Date(typeof t.createdAt === 'string' && !t.createdAt.endsWith('Z') && !t.createdAt.includes('+') ? t.createdAt + 'Z' : t.createdAt));
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push(t);
  });

  // Plan distribution
  const planDist = tenants.reduce((acc, t) => {
    acc[t.plan] = (acc[t.plan] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Business type distribution
  const typeDist = tenants.reduce((acc, t) => {
    if (t.businessType) acc[t.businessType] = (acc[t.businessType] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const topTypes = Object.entries(typeDist).sort((a, b) => b[1] - a[1]).slice(0, 6);

  return (
    <div>
      <PageHeader
        title="Actividad de la Plataforma"
        description="Registro de negocios y métricas del sistema"
        action={
          <button onClick={refresh} disabled={refreshing}
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800 border border-slate-200 px-3 py-2 rounded-lg transition-colors">
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            Actualizar
          </button>
        }
      />

      {/* ─── Overview metrics ────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard icon={Building2} label="Total Negocios" value={stats?.totalTenants ?? 0} color="text-red-600 bg-red-50" />
        <MetricCard icon={Users}     label="Total Usuarios"  value={stats?.totalUsers ?? 0}   color="text-blue-600 bg-blue-50" />
        <MetricCard icon={ShoppingCart} label="Total Ventas" value={stats?.totalSales ?? 0}   color="text-purple-600 bg-purple-50" />
        <MetricCard icon={Activity}  label="MRR Estimado"
          value={`$${(stats?.mrr ?? 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}`}
          color="text-amber-600 bg-amber-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Plan distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Settings size={16} className="text-slate-400" /> Distribución por Plan
          </h3>
          <div className="space-y-3">
            {Object.entries(planDist).map(([plan, count]) => (
              <div key={plan} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PLAN_COLORS[plan] ?? 'bg-slate-100 text-slate-600'}`}>
                    {PLAN_LABELS[plan] ?? plan}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-slate-100 rounded-full h-1.5">
                    <div className="bg-red-500 h-1.5 rounded-full"
                      style={{ width: `${(count / Math.max(tenants.length, 1)) * 100}%` }} />
                  </div>
                  <span className="text-sm font-medium text-slate-700 w-6 text-right">{count}</span>
                </div>
              </div>
            ))}
            {Object.keys(planDist).length === 0 && (
              <p className="text-sm text-slate-400">Sin datos</p>
            )}
          </div>
        </div>

        {/* Business type distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 lg:col-span-2">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Building2 size={16} className="text-slate-400" /> Top Tipos de Negocio
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {topTypes.map(([type, count]) => (
              <div key={type} className="flex items-center gap-3 bg-slate-50 rounded-lg p-3">
                <span className="text-2xl">{BUSINESS_EMOJI[type] ?? '🏬'}</span>
                <div>
                  <p className="text-xs font-medium text-slate-700 capitalize">{type}</p>
                  <p className="text-lg font-bold text-slate-800">{count}</p>
                </div>
              </div>
            ))}
            {topTypes.length === 0 && (
              <p className="text-sm text-slate-400 col-span-2">Sin datos de tipo de negocio</p>
            )}
          </div>
        </div>
      </div>

      {/* ─── Timeline of registrations ──────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <h3 className="font-semibold text-slate-800 mb-5 flex items-center gap-2">
          <Activity size={16} className="text-slate-400" />
          Historial de Negocios Registrados
        </h3>

        {tenants.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">No hay negocios registrados aún</p>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([day, items]) => (
              <div key={day}>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3 capitalize">{day}</p>
                <div className="space-y-2">
                  {items.map((t) => (
                    <div key={t.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{BUSINESS_EMOJI[t.businessType] ?? '🏬'}</span>
                        <div>
                          <p className="text-sm font-medium text-slate-800">{t.businessName}</p>
                          <p className="text-xs text-slate-400">
                            {t.userCount} usuario{t.userCount !== 1 ? 's' : ''} · {t.saleCount} venta{t.saleCount !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PLAN_COLORS[t.plan] ?? 'bg-slate-100 text-slate-600'}`}>
                          {PLAN_LABELS[t.plan] ?? t.plan}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${t.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {t.isActive ? 'Activo' : 'Inactivo'}
                        </span>
                        <p className="text-xs text-slate-400 hidden sm:block">
                          {new Intl.DateTimeFormat('es-DO', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Santo_Domingo' }).format(new Date(typeof t.createdAt === 'string' && !t.createdAt.endsWith('Z') && !t.createdAt.includes('+') ? t.createdAt + 'Z' : t.createdAt))}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, color }: {
  icon: any; label: string; value: string | number; color: string;
}) {
  const [bg, text] = color.split(' ');
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
      <div className={`${bg} p-2.5 rounded-lg w-fit mb-3`}>
        <Icon size={18} className={text} />
      </div>
      <p className="text-2xl font-bold text-slate-800">{typeof value === 'number' ? value.toLocaleString('es-DO') : value}</p>
      <p className="text-xs text-slate-500 mt-1">{label}</p>
    </div>
  );
}
