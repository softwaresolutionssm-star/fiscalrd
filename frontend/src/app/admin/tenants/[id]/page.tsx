'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { toast } from 'sonner';
import { PageHeader } from '@/components/ui/page-header';
import {
  Building2, Mail, Phone, MapPin, Hash, Globe,
  ToggleLeft, ToggleRight, ArrowLeft, Edit2, Save,
  X, Plus, Trash2, UserCheck, UserX, Eye, EyeOff, Zap, Tag,
} from 'lucide-react';
import { useConfirm } from '@/components/ui/confirm-dialog';
import Link from 'next/link';

interface TenantUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isActive: boolean;
}

const BUSINESS_TYPES = [
  { value: 'ferreteria', label: 'Ferretería', emoji: '🔧' },
  { value: 'colmado', label: 'Colmado', emoji: '🛒' },
  { value: 'supermercado', label: 'Supermercado', emoji: '🏪' },
  { value: 'farmacia', label: 'Farmacia', emoji: '💊' },
  { value: 'restaurante', label: 'Restaurante', emoji: '🍽️' },
  { value: 'ropa', label: 'Ropa/Calzado', emoji: '👗' },
  { value: 'salon', label: 'Salón/Barbería', emoji: '💇' },
  { value: 'taller', label: 'Taller', emoji: '🚗' },
  { value: 'tecnologia', label: 'Tecnología', emoji: '💻' },
  { value: 'servicios', label: 'Servicios', emoji: '🏢' },
  { value: 'constructora', label: 'Constructora', emoji: '🏗️' },
  { value: 'importadora', label: 'Importadora', emoji: '📦' },
  { value: 'consultorio', label: 'Consultorio', emoji: '🏥' },
  { value: 'educacion', label: 'Educación', emoji: '🎓' },
  { value: 'hotel', label: 'Hotel', emoji: '🏨' },
  { value: 'transporte', label: 'Transporte', emoji: '🚛' },
  { value: 'agropecuario', label: 'Agropecuario', emoji: '🌾' },
  { value: 'bar', label: 'Bar', emoji: '🍺' },
  { value: 'joyeria', label: 'Joyería', emoji: '💍' },
  { value: 'panaderia', label: 'Panadería', emoji: '🥖' },
  { value: 'otro', label: 'Otro', emoji: '🏬' },
];

const PLAN_COLORS: Record<string, string> = {
  free: 'bg-slate-100 text-slate-600', basic: 'bg-blue-100 text-blue-700',
  pro: 'bg-purple-100 text-purple-700', enterprise: 'bg-amber-100 text-amber-700',
};
const PLAN_LABELS: Record<string, string> = {
  free: 'Gratis', basic: 'Básico', pro: 'Pro', enterprise: 'Empresarial',
};

interface TenantDetail {
  id: string;
  businessName: string;
  businessType: string;
  rnc: string;
  email: string;
  phone?: string;
  address?: string;
  website?: string;
  plan: string;
  isActive: boolean;
  saleCount: number;
  users: TenantUser[];
}

const roleLabels: Record<string, string> = {
  owner: 'Propietario', admin: 'Administrador', accountant: 'Contador',
  cashier: 'Cajero', employee: 'Empleado',
};
const roleColors: Record<string, string> = {
  owner: 'bg-purple-100 text-purple-700', admin: 'bg-blue-100 text-blue-700',
  accountant: 'bg-yellow-100 text-yellow-700', cashier: 'bg-green-100 text-green-700',
  employee: 'bg-slate-100 text-slate-600',
};
const ROLES = ['owner', 'admin', 'accountant', 'cashier', 'employee'];

export default function AdminTenantDetailPage() {
  const confirm = useConfirm();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<TenantDetail>>({});
  const [saving, setSaving] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newUser, setNewUser] = useState({ firstName: '', lastName: '', email: '', password: '', role: 'admin' });
  const [addingUser, setAddingUser] = useState(false);
  const [deletingTenant, setDeletingTenant] = useState(false);
  const [alanubeKey, setAlanubeKey] = useState('');
  const [alanubeSandbox, setAlanubeSandbox] = useState(true);
  const [savingAlanube, setSavingAlanube] = useState(false);
  const [showAlanubeKey, setShowAlanubeKey] = useState(false);
  const [discountPct, setDiscountPct] = useState(0);
  const [savingDiscount, setSavingDiscount] = useState(false);

  useEffect(() => {
    load();
  }, [id]);

  async function load() {
    try {
      const res = await api.get(`/admin/tenants/${id}`);
      const data = res.data.data ?? res.data;
      // backend returns { tenant, users, saleCount }
      if (data.tenant) {
        setTenant({ ...data.tenant, users: data.users ?? [], saleCount: data.saleCount ?? 0 });
        setDiscountPct(Number(data.tenant.billingDiscountPct ?? 0));
      } else {
        setTenant(data);
        setDiscountPct(Number(data.billingDiscountPct ?? 0));
      }
    } catch {
      toast.error('Error cargando negocio');
    } finally {
      setLoading(false);
    }
  }

  const startEdit = () => {
    if (!tenant) return;
    setEditForm({
      businessName: tenant.businessName,
      rnc: tenant.rnc,
      email: tenant.email,
      phone: tenant.phone ?? '',
      address: tenant.address ?? '',
      website: tenant.website ?? '',
      ...(tenant as any).maxBranches ? { maxBranches: (tenant as any).maxBranches } : {},
    });
    setEditing(true);
  };

  const handleSave = async () => {
    if (!tenant) return;
    setSaving(true);
    try {
      const payload: any = {};
      if (editForm.businessName) payload.businessName = editForm.businessName;
      if (editForm.rnc) payload.rnc = editForm.rnc;
      if (editForm.email) payload.email = editForm.email;
      if (editForm.phone) payload.phone = editForm.phone;
      if (editForm.address) payload.address = editForm.address;
      if (editForm.website) payload.website = editForm.website;
      if ((editForm as any).maxBranches) payload.maxBranches = (editForm as any).maxBranches;

      const res = await api.put(`/admin/tenants/${tenant.id}`, payload);
      const updated = res.data.data ?? res.data;
      setTenant((prev) => prev ? { ...prev, ...updated } : prev);
      setEditing(false);
      toast.success('Negocio actualizado');
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg ?? 'Error al actualizar');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async () => {
    if (!tenant) return;
    try {
      await api.patch(`/admin/tenants/${tenant.id}/toggle`, { isActive: !tenant.isActive });
      setTenant((prev) => prev ? { ...prev, isActive: !prev.isActive } : prev);
      toast.success(tenant.isActive ? 'Negocio desactivado' : 'Negocio activado');
    } catch {
      toast.error('Error al cambiar estado');
    }
  };

  const handleDelete = async () => {
    if (!tenant) return;
    if (!await confirm({ title: `Eliminar "${tenant.businessName}"`, message: '¿Estás seguro? Se eliminarán todos los datos de este negocio. Esta acción no se puede deshacer.', confirmText: 'Eliminar definitivamente' })) return;
    setDeletingTenant(true);
    try {
      await api.delete(`/admin/tenants/${tenant.id}`);
      toast.success('Negocio eliminado');
      router.push('/admin/tenants');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Error al eliminar');
      setDeletingTenant(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;
    setAddingUser(true);
    try {
      const res = await api.post(`/admin/tenants/${tenant.id}/users`, newUser);
      const created = res.data.data ?? res.data;
      setTenant((prev) => prev ? { ...prev, users: [...prev.users, created] } : prev);
      setNewUser({ firstName: '', lastName: '', email: '', password: '', role: 'admin' });
      setShowAddUser(false);
      toast.success('Usuario creado exitosamente');
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg ?? 'Error al crear usuario');
    } finally {
      setAddingUser(false);
    }
  };

  const toggleUser = async (user: TenantUser) => {
    try {
      await api.patch(`/admin/users/${user.id}/toggle`, { isActive: !user.isActive });
      setTenant((prev) =>
        prev ? {
          ...prev,
          users: prev.users.map((u) => u.id === user.id ? { ...u, isActive: !u.isActive } : u),
        } : prev
      );
      toast.success(user.isActive ? 'Usuario desactivado' : 'Usuario activado');
    } catch {
      toast.error('Error al cambiar estado del usuario');
    }
  };

  const deleteUser = async (user: TenantUser) => {
    if (!await confirm({ title: 'Eliminar usuario', message: `¿Eliminar al usuario ${user.firstName} ${user.lastName}?`, confirmText: 'Eliminar' })) return;
    try {
      await api.delete(`/admin/users/${user.id}`);
      setTenant((prev) =>
        prev ? { ...prev, users: prev.users.filter((u) => u.id !== user.id) } : prev
      );
      toast.success('Usuario eliminado');
    } catch {
      toast.error('Error al eliminar usuario');
    }
  };

  const handleSaveDiscount = async () => {
    if (!tenant) return;
    setSavingDiscount(true);
    try {
      await api.patch(`/billing/admin/tenants/${tenant.id}/discount`, { discountPct });
      toast.success(`Descuento de ${discountPct}% aplicado`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Error al aplicar descuento');
    } finally {
      setSavingDiscount(false);
    }
  };

  const handleSaveAlanube = async () => {
    if (!tenant) return;
    setSavingAlanube(true);
    try {
      await api.patch(`/admin/tenants/${tenant.id}/alanube`, {
        alanubeApiKey: alanubeKey || undefined,
        alanubeSandbox,
      });
      toast.success('Configuración Alanube guardada');
      setAlanubeKey('');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Error al guardar Alanube');
    } finally {
      setSavingAlanube(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
    </div>
  );

  if (!tenant) return (
    <div className="text-center py-16 text-slate-400">Negocio no encontrado</div>
  );

  return (
    <div>
      <PageHeader
        title={tenant.businessName}
        description={`RNC: ${tenant.rnc}`}
        action={
          <div className="flex items-center gap-2">
            <Link
              href="/admin/tenants"
              className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-800 transition-colors px-3 py-2"
            >
              <ArrowLeft size={16} /> Volver
            </Link>
            <button
              onClick={toggleActive}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                tenant.isActive
                  ? 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                  : 'bg-green-50 text-green-600 hover:bg-green-100'
              }`}
            >
              {tenant.isActive ? <ToggleLeft size={16} /> : <ToggleRight size={16} />}
              {tenant.isActive ? 'Desactivar' : 'Activar'}
            </button>
            <button
              onClick={handleDelete}
              disabled={deletingTenant}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              <Trash2 size={15} />
              Eliminar
            </button>
          </div>
        }
      />

      {/* ─── Business Info Card ────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 mb-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <Building2 size={18} className="text-red-500" />
            Información del Negocio
          </h2>
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
              tenant.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {tenant.isActive ? 'Activo' : 'Inactivo'}
            </span>
            {!editing ? (
              <button
                onClick={startEdit}
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Edit2 size={14} /> Editar
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditing(false)}
                  className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 px-2 py-1.5 rounded-lg"
                >
                  <X size={14} /> Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Save size={14} />
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            )}
          </div>
        </div>

        {!editing ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <InfoItem icon={Hash} label="RNC" value={tenant.rnc} />
            <InfoItem icon={Mail} label="Email" value={tenant.email ?? '—'} />
            <InfoItem icon={Phone} label="Teléfono" value={tenant.phone ?? '—'} />
            <InfoItem icon={MapPin} label="Dirección" value={tenant.address ?? '—'} />
            <InfoItem icon={Globe} label="Sitio web" value={tenant.website ?? '—'} />
            <InfoItem icon={Building2} label="Total ventas" value={tenant.saleCount.toLocaleString('es-DO')} />
            <div className="flex items-start gap-3">
              <div className="bg-slate-100 p-2 rounded-lg mt-0.5">
                <span className="text-base">{BUSINESS_TYPES.find(b => b.value === tenant.businessType)?.emoji ?? '🏬'}</span>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">Tipo de Negocio</p>
                <p className="text-sm font-medium text-slate-800">
                  {BUSINESS_TYPES.find(b => b.value === tenant.businessType)?.label ?? tenant.businessType}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-slate-100 p-2 rounded-lg mt-0.5">
                <Building2 size={15} className="text-slate-500" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">Plan</p>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PLAN_COLORS[tenant.plan] ?? 'bg-slate-100 text-slate-600'}`}>
                  {PLAN_LABELS[tenant.plan] ?? tenant.plan}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Nombre del Negocio</label>
              <input
                value={editForm.businessName ?? ''}
                onChange={(e) => setEditForm((p) => ({ ...p, businessName: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">RNC</label>
              <input
                value={editForm.rnc ?? ''}
                maxLength={9}
                onChange={(e) => setEditForm((p) => ({ ...p, rnc: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-500/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Email</label>
              <input
                type="email"
                value={editForm.email ?? ''}
                onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Teléfono</label>
              <input
                value={editForm.phone ?? ''}
                onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Dirección</label>
              <input
                value={editForm.address ?? ''}
                onChange={(e) => setEditForm((p) => ({ ...p, address: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Sitio Web</label>
              <input
                value={editForm.website ?? ''}
                onChange={(e) => setEditForm((p) => ({ ...p, website: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Tipo de Negocio</label>
              <select
                value={(editForm as any).businessType ?? tenant.businessType ?? 'otro'}
                onChange={(e) => setEditForm((p) => ({ ...p, businessType: e.target.value } as any))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500/30"
              >
                {BUSINESS_TYPES.map(bt => (
                  <option key={bt.value} value={bt.value}>{bt.emoji} {bt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Plan</label>
              <select
                value={(editForm as any).plan ?? tenant.plan ?? 'free'}
                onChange={(e) => setEditForm((p) => ({ ...p, plan: e.target.value } as any))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500/30"
              >
                <option value="free">Gratis - RD$0/mes</option>
                <option value="basic">Básico - RD$1,500/mes</option>
                <option value="pro">Pro - RD$3,500/mes</option>
                <option value="enterprise">Empresarial - RD$8,000/mes</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Plan de Sucursales (máx. permitidas)</label>
              <select
                value={(editForm as any).maxBranches ?? (tenant as any).maxBranches ?? 1}
                onChange={(e) => setEditForm((p) => ({ ...p, maxBranches: parseInt(e.target.value) } as any))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500/30"
              >
                <option value={1}>1 sucursal</option>
                <option value={2}>2 sucursales</option>
                <option value={3}>3 sucursales</option>
                <option value={4}>4 sucursales</option>
                <option value={5}>5 sucursales</option>
                <option value={6}>6 sucursales</option>
                <option value={10}>10 sucursales</option>
                <option value={999}>Ilimitado</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* ─── Alanube Card ─────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 mb-6">
        <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2 mb-5">
          <Zap size={18} className="text-yellow-500" />
          Configuración Alanube (DGII e-CF)
        </h2>
        <p className="text-sm text-slate-500 mb-4">
          Alanube es el intermediario autorizado por la DGII para enviar comprobantes fiscales electrónicos (e-CF) bajo la Ley 32-23.
          La API key se usa para firmar y transmitir los comprobantes de este negocio.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">API Key de Alanube</label>
            <div className="relative">
              <input
                type={showAlanubeKey ? 'text' : 'password'}
                value={alanubeKey}
                onChange={e => setAlanubeKey(e.target.value)}
                placeholder="Dejar vacío para no cambiar"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 pr-9 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-500/30"
              />
              <button type="button" onClick={() => setShowAlanubeKey(v => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showAlanubeKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Modo</label>
            <div className="flex gap-3 mt-1">
              <button
                onClick={() => setAlanubeSandbox(true)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${alanubeSandbox ? 'bg-amber-50 border-amber-300 text-amber-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
              >
                Pruebas (Sandbox)
              </button>
              <button
                onClick={() => setAlanubeSandbox(false)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${!alanubeSandbox ? 'bg-green-50 border-green-300 text-green-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
              >
                Producción
              </button>
            </div>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleSaveAlanube}
            disabled={savingAlanube}
            className="flex items-center gap-1.5 bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            <Save size={14} />
            {savingAlanube ? 'Guardando...' : 'Guardar Configuración Alanube'}
          </button>
        </div>
      </div>

      {/* ─── Descuento de Facturación ─────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 mb-6">
        <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2 mb-4">
          <Tag size={18} className="text-green-500" />
          Descuento de Facturación
        </h2>
        <p className="text-sm text-slate-500 mb-4">
          Aplica un descuento porcentual sobre el total mensual de este negocio.
          El descuento se calcula sobre el monto final (plan × sucursales).
        </p>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={100}
              value={discountPct}
              onChange={e => setDiscountPct(Number(e.target.value))}
              className="w-24 border border-slate-200 rounded-lg px-3 py-2 text-sm text-center font-bold focus:outline-none focus:ring-2 focus:ring-green-500/30"
            />
            <span className="text-slate-500 text-sm font-medium">% de descuento</span>
          </div>
          {discountPct > 0 && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
              {discountPct}% de descuento activo
            </span>
          )}
          {discountPct === 0 && (
            <span className="text-xs text-slate-400">Sin descuento (precio normal)</span>
          )}
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleSaveDiscount}
            disabled={savingDiscount}
            className="flex items-center gap-1.5 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            <Save size={14} />
            {savingDiscount ? 'Guardando...' : 'Guardar Descuento'}
          </button>
        </div>
      </div>

      {/* ─── Users Card ───────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">
            Usuarios ({tenant.users.length})
          </h2>
          <button
            onClick={() => setShowAddUser(!showAddUser)}
            className="flex items-center gap-1.5 bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
          >
            <Plus size={15} />
            Agregar Usuario
          </button>
        </div>

        {/* Add user form */}
        {showAddUser && (
          <div className="border-b border-slate-100 bg-slate-50 px-6 py-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Nuevo Usuario para {tenant.businessName}</h3>
            <form onSubmit={handleAddUser} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Nombre</label>
                <input required value={newUser.firstName} onChange={(e) => setNewUser((p) => ({ ...p, firstName: e.target.value }))}
                  placeholder="Pedro" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500/30" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Apellido</label>
                <input required value={newUser.lastName} onChange={(e) => setNewUser((p) => ({ ...p, lastName: e.target.value }))}
                  placeholder="González" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500/30" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Email</label>
                <input required type="email" value={newUser.email} onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))}
                  placeholder="pedro@negocio.do" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500/30" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Contraseña</label>
                <div className="relative">
                  <input required type={showPassword ? 'text' : 'password'} value={newUser.password}
                    onChange={(e) => setNewUser((p) => ({ ...p, password: e.target.value }))}
                    placeholder="Mín. 6 caracteres" className="w-full border border-slate-200 rounded-lg px-3 py-2 pr-9 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500/30" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400">
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Rol</label>
                <select value={newUser.role} onChange={(e) => setNewUser((p) => ({ ...p, role: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500/30">
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{roleLabels[r]}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end gap-2">
                <button type="submit" disabled={addingUser}
                  className="flex items-center gap-1.5 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50">
                  <Save size={14} />
                  {addingUser ? 'Creando...' : 'Crear'}
                </button>
                <button type="button" onClick={() => setShowAddUser(false)}
                  className="px-4 py-2 rounded-lg text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-200 transition-colors">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <th className="px-6 py-3 text-left font-medium">Nombre</th>
                <th className="px-6 py-3 text-left font-medium">Email</th>
                <th className="px-6 py-3 text-left font-medium">Rol</th>
                <th className="px-6 py-3 text-center font-medium">Estado</th>
                <th className="px-6 py-3 text-center font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {tenant.users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                    No hay usuarios — agrega el primero con el botón de arriba
                  </td>
                </tr>
              )}
              {tenant.users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3 font-medium text-slate-800">
                    {u.firstName} {u.lastName}
                  </td>
                  <td className="px-6 py-3 text-slate-600">{u.email}</td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleColors[u.role] ?? 'bg-slate-100 text-slate-600'}`}>
                      {roleLabels[u.role] ?? u.role}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {u.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => toggleUser(u)}
                        title={u.isActive ? 'Desactivar' : 'Activar'}
                        className={`p-1.5 rounded-lg transition-colors ${
                          u.isActive
                            ? 'text-amber-500 hover:bg-amber-50'
                            : 'text-green-500 hover:bg-green-50'
                        }`}
                      >
                        {u.isActive ? <UserX size={15} /> : <UserCheck size={15} />}
                      </button>
                      <button
                        onClick={() => deleteUser(u)}
                        title="Eliminar usuario"
                        className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={15} />
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

function InfoItem({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="bg-slate-100 p-2 rounded-lg mt-0.5">
        <Icon size={15} className="text-slate-500" />
      </div>
      <div>
        <p className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">{label}</p>
        <p className="text-sm font-medium text-slate-800">{value}</p>
      </div>
    </div>
  );
}
