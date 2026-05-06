'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { toast } from 'sonner';
import { PageHeader } from '@/components/ui/page-header';
import { Search, ToggleLeft, ToggleRight, Plus, LogIn } from 'lucide-react';

interface Tenant {
  id: string;
  businessName: string;
  businessType: string;
  rnc: string;
  email: string;
  plan: string;
  userCount: number;
  saleCount: number;
  isActive: boolean;
  createdAt: string;
}

const PLAN_COLORS: Record<string, string> = {
  free: 'bg-slate-100 text-slate-600', basic: 'bg-blue-100 text-blue-700',
  pro: 'bg-purple-100 text-purple-700', enterprise: 'bg-amber-100 text-amber-700',
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
const BUSINESS_LABELS: Record<string, string> = {
  ferreteria: 'Ferretería', colmado: 'Colmado', supermercado: 'Supermercado',
  farmacia: 'Farmacia', restaurante: 'Restaurante', ropa: 'Ropa/Calzado',
  salon: 'Salón/Barbería', taller: 'Taller Mecánico', tecnologia: 'Tecnología',
  servicios: 'Servicios', constructora: 'Constructora', importadora: 'Importadora',
  consultorio: 'Consultorio', educacion: 'Educación', hotel: 'Hotel',
  transporte: 'Transporte', agropecuario: 'Agropecuario', bar: 'Bar',
  joyeria: 'Joyería', panaderia: 'Panadería', otro: 'Otro',
};

export default function AdminTenantsPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [search, setSearch] = useState('');
  const [filterPlan, setFilterPlan] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [loading, setLoading] = useState(true);
  const [impersonating, setImpersonating] = useState<string | null>(null);

  useEffect(() => {
    api.get('/admin/tenants')
      .then(r => setTenants(r.data.data ?? r.data))
      .catch(() => toast.error('Error cargando negocios'))
      .finally(() => setLoading(false));
  }, []);

  const toggleActive = async (tenant: Tenant) => {
    try {
      await api.patch(`/admin/tenants/${tenant.id}/toggle`, { isActive: !tenant.isActive });
      setTenants(prev => prev.map(t => t.id === tenant.id ? { ...t, isActive: !t.isActive } : t));
      toast.success(tenant.isActive ? 'Negocio desactivado' : 'Negocio activado');
    } catch {
      toast.error('Error al cambiar estado');
    }
  };

  const handleImpersonate = async (tenant: Tenant) => {
    // Find the owner user for this tenant first
    setImpersonating(tenant.id);
    try {
      const usersRes = await api.get(`/admin/tenants/${tenant.id}/users`);
      const users = usersRes.data.data ?? usersRes.data;
      const owner = users.find((u: any) => u.role === 'owner') ?? users[0];
      if (!owner) {
        toast.error('Este negocio no tiene usuarios');
        return;
      }

      const res = await api.post(`/admin/impersonate/${owner.id}`);
      const { accessToken, user: impUser } = res.data.data ?? res.data;

      // Save original token before replacing
      const originalToken = localStorage.getItem('token');
      const originalUser = localStorage.getItem('user');
      if (originalToken) localStorage.setItem('impersonate_original_token', originalToken);
      if (originalUser) localStorage.setItem('impersonate_original_user', originalUser);

      // Store impersonation info
      localStorage.setItem('token', accessToken);
      localStorage.setItem('user', JSON.stringify({ ...impUser, businessName: tenant.businessName }));
      localStorage.setItem('is_impersonating', 'true');
      localStorage.setItem('impersonate_tenant_name', tenant.businessName);

      toast.success(`Impersonando a ${tenant.businessName}`);
      router.push('/dashboard');
    } catch {
      toast.error('Error al impersonar el negocio');
    } finally {
      setImpersonating(null);
    }
  };

  const filtered = tenants.filter((t) => {
    if (filterPlan !== 'all' && t.plan !== filterPlan) return false;
    if (filterStatus === 'active' && !t.isActive) return false;
    if (filterStatus === 'inactive' && t.isActive) return false;
    if (filterType !== 'all' && t.businessType !== filterType) return false;
    if (search) {
      const s = search.toLowerCase();
      return t.businessName.toLowerCase().includes(s) ||
        t.rnc.includes(s) || (t.email ?? '').toLowerCase().includes(s);
    }
    return true;
  });

  // unique business types in the data
  const availableTypes = [...new Set(tenants.map(t => t.businessType).filter(Boolean))];

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Negocios"
        description={`${tenants.length} negocios registrados en FiscalRD`}
        action={
          <Link href="/admin/tenants/new"
            className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors">
            <Plus size={15} /> Nuevo Negocio
          </Link>
        }
      />

      {/* ─── Filters ───────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 mb-5">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-48">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Buscar por nombre, RNC o email..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30" />
          </div>
          {/* Plan filter */}
          <select value={filterPlan} onChange={e => setFilterPlan(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30">
            <option value="all">Todos los planes</option>
            <option value="free">Gratis</option>
            <option value="basic">Básico</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Empresarial</option>
          </select>
          {/* Status filter */}
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30">
            <option value="all">Todos los estados</option>
            <option value="active">Solo activos</option>
            <option value="inactive">Solo inactivos</option>
          </select>
          {/* Business type filter */}
          {availableTypes.length > 0 && (
            <select value={filterType} onChange={e => setFilterType(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30">
              <option value="all">Todos los tipos</option>
              {availableTypes.map(t => (
                <option key={t} value={t}>{BUSINESS_EMOJI[t]} {BUSINESS_LABELS[t] ?? t}</option>
              ))}
            </select>
          )}
          <span className="text-xs text-slate-400 ml-auto">
            {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* ─── Table ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <th className="px-5 py-3 text-left font-medium">Negocio</th>
                <th className="px-5 py-3 text-left font-medium">RNC</th>
                <th className="px-5 py-3 text-left font-medium">Plan</th>
                <th className="px-5 py-3 text-center font-medium">Estado</th>
                <th className="px-5 py-3 text-right font-medium">Usuarios</th>
                <th className="px-5 py-3 text-right font-medium">Ventas</th>
                <th className="px-5 py-3 text-center font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-10 text-center text-slate-400">
                  No se encontraron negocios con esos filtros
                </td></tr>
              )}
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{BUSINESS_EMOJI[t.businessType] ?? '🏬'}</span>
                      <div>
                        <p className="font-medium text-slate-800">{t.businessName}</p>
                        <p className="text-xs text-slate-400">{BUSINESS_LABELS[t.businessType] ?? t.businessType}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-slate-600 font-mono text-xs">{t.rnc}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PLAN_COLORS[t.plan] ?? 'bg-slate-100 text-slate-600'}`}>
                      {PLAN_LABELS[t.plan] ?? t.plan}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${t.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {t.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right text-slate-600">{t.userCount}</td>
                  <td className="px-5 py-3 text-right text-slate-600">{t.saleCount}</td>
                  <td className="px-5 py-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <Link href={`/admin/tenants/${t.id}`}
                        className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors">
                        Ver
                      </Link>
                      <button onClick={() => toggleActive(t)}
                        className={`text-xs px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                          t.isActive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'
                        }`}>
                        {t.isActive ? <ToggleLeft size={12} /> : <ToggleRight size={12} />}
                        {t.isActive ? 'Desactivar' : 'Activar'}
                      </button>
                      <button
                        onClick={() => handleImpersonate(t)}
                        disabled={impersonating === t.id}
                        className="text-xs px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors flex items-center gap-1 disabled:opacity-50"
                      >
                        {impersonating === t.id
                          ? <div className="animate-spin rounded-full h-3 w-3 border-b border-indigo-700" />
                          : <LogIn size={12} />}
                        Impersonar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
