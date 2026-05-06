'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import api from '@/lib/api';
import { toast } from 'sonner';
import {
  Plus, Pencil, MapPin, Phone, Mail, Star, GitBranch, Info,
  Users, Users2, TrendingUp, Power, PowerOff, ArrowRightLeft,
} from 'lucide-react';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { formatCurrency } from '@/lib/utils';
import { useBranch } from '@/contexts/branch-context';
import { useAuth } from '@/contexts/auth-context';

interface BranchStats {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  isMain: boolean;
  isActive: boolean;
  usersCount: number;
  employeesCount: number;
  salesToday: number;
  salesMonth: number;
}

interface BranchPricing {
  tier2: number;
  tier3: number;
  tier4plus: number;
}

const emptyForm = { name: '', address: '', phone: '', email: '' };

export default function BranchesPage() {
  const confirm = useConfirm();
  const { user: currentUser } = useAuth();
  const isOwner = currentUser?.role === 'owner';
  const { branches: ctxBranches, setActiveBranchId: setCtxBranch } = useBranch();
  const [branches, setBranches] = useState<BranchStats[]>([]);
  const [pricing, setPricing] = useState<BranchPricing | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<BranchStats | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [monthlyPrice, setMonthlyPrice] = useState(0);

  const load = async () => {
    try {
      const r = await api.get('/branches/stats');
      setBranches(Array.isArray(r.data.data) ? r.data.data : []);
    } catch {
      try {
        const r2 = await api.get('/branches');
        setBranches((Array.isArray(r2.data.data) ? r2.data.data : []).map((b: any) => ({
          ...b, usersCount: 0, employeesCount: 0, salesToday: 0, salesMonth: 0,
        })));
      } catch { setBranches([]); }
    }
    try {
      const r = await api.get('/branches/summary');
      setMonthlyPrice(r.data.data?.monthlyPrice ?? 0);
    } catch {}
  };

  const loadPricing = async () => {
    try {
      const r = await api.get('/branches/pricing');
      setPricing(r.data.data);
    } catch {}
  };

  useEffect(() => { load(); loadPricing(); }, []);

  const resetForm = () => { setForm(emptyForm); setEditing(null); setShowForm(false); };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await api.patch(`/branches/${editing.id}`, form);
        toast.success('Sucursal actualizada');
      } else {
        await api.post('/branches', form);
        toast.success('Sucursal creada');
      }
      resetForm();
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Error al guardar');
    } finally { setSaving(false); }
  };

  const toggleActive = async (branch: BranchStats) => {
    const deactivating = branch.isActive;
    if (deactivating) {
      try {
        const r = await api.get(`/branches/${branch.id}/deactivation-warnings`);
        const w = r.data.data;
        const warnings: string[] = [];
        if (w.usersCount > 0) warnings.push(`${w.usersCount} usuario(s) asignado(s) a esta sucursal quedarán sin acceso`);
        if (w.employeesCount > 0) warnings.push(`${w.employeesCount} empleado(s) activo(s) en esta sucursal`);
        if (w.openCashRegisters > 0) warnings.push(`${w.openCashRegisters} caja(s) abierta(s) — deberán cerrarse manualmente`);
        if (w.pendingAR > 0) warnings.push(`${w.pendingAR} cuenta(s) por cobrar pendiente(s)`);

        if (!await confirm({
          title: `Desactivar "${branch.name}"`,
          message: warnings.length > 0
            ? `Antes de desactivar, considera:\n\n${warnings.map(w => `• ${w}`).join('\n')}`
            : 'Los usuarios asignados a esta sucursal no podrán acceder hasta que se reactive.',
          confirmText: 'Desactivar de todos modos',
          variant: 'warning',
        })) return;
      } catch {
        if (!await confirm({
          title: `Desactivar "${branch.name}"`,
          message: 'Los usuarios asignados a esta sucursal no podrán acceder hasta que se reactive.',
          confirmText: 'Desactivar',
          variant: 'warning',
        })) return;
      }
    }

    try {
      await api.patch(`/branches/${branch.id}/toggle-active`, { isActive: !branch.isActive });
      toast.success(deactivating ? 'Sucursal desactivada' : 'Sucursal activada');
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Error al cambiar estado');
    }
  };

  const activeBranches = branches.filter(b => b.isActive);
  const totalSalesToday = activeBranches.reduce((s, b) => s + b.salesToday, 0);
  const totalSalesMonth = activeBranches.reduce((s, b) => s + b.salesMonth, 0);

  return (
    <div>
      <PageHeader
        title="Sucursales"
        description="Gestiona las sucursales de tu negocio"
        action={isOwner ? (
          <button
            onClick={() => { setEditing(null); setForm(emptyForm); setShowForm(true); }}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
          >
            <Plus size={16} /> Nueva Sucursal
          </button>
        ) : undefined}
      />

      {/* Resumen */}
      {branches.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
            <p className="text-xs text-slate-500">Sucursales activas</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{activeBranches.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
            <p className="text-xs text-slate-500">Ventas hoy (total)</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(totalSalesToday)}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
            <p className="text-xs text-slate-500">Ventas este mes (total)</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{formatCurrency(totalSalesMonth)}</p>
          </div>
        </div>
      )}

      {/* Banner de transferencia — visible cuando hay 2+ sucursales activas */}
      {activeBranches.length >= 2 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowRightLeft size={16} className="text-amber-600" />
            <p className="text-sm text-amber-700 font-medium">Puedes transferir inventario entre sucursales</p>
          </div>
          <a href="/dashboard/inventory/transfer" className="flex items-center gap-1.5 bg-amber-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-amber-700 transition-colors">
            <ArrowRightLeft size={12} /> Transferir inventario
          </a>
        </div>
      )}

      {/* Cards de sucursales */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {branches.map(branch => (
          <div
            key={branch.id}
            className={`bg-white rounded-xl border shadow-sm flex flex-col gap-0 overflow-hidden ${
              branch.isMain ? 'border-blue-200' : branch.isActive ? 'border-slate-100' : 'border-slate-200 opacity-60'
            }`}
          >
            {/* Header */}
            <div className="px-5 pt-5 pb-3">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  {branch.isMain && <Star size={13} className="text-amber-400 fill-amber-400 flex-shrink-0" />}
                  <h3 className="text-sm font-semibold text-slate-800">{branch.name}</h3>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                    branch.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                  }`}>{branch.isActive ? 'Activa' : 'Inactiva'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => { setEditing(branch); setForm({ name: branch.name, address: branch.address ?? '', phone: branch.phone ?? '', email: branch.email ?? '' }); setShowForm(true); }}
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Pencil size={13} />
                  </button>
                  {isOwner && !branch.isMain && (
                    <button
                      onClick={() => toggleActive(branch)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        branch.isActive
                          ? 'text-slate-400 hover:text-red-500 hover:bg-red-50'
                          : 'text-slate-400 hover:text-green-600 hover:bg-green-50'
                      }`}
                      title={branch.isActive ? 'Desactivar' : 'Activar'}
                    >
                      {branch.isActive ? <PowerOff size={13} /> : <Power size={13} />}
                    </button>
                  )}
                </div>
              </div>

              {/* Contact info */}
              <div className="space-y-1 text-xs text-slate-500">
                {branch.address && <div className="flex items-center gap-1.5"><MapPin size={11} className="flex-shrink-0" />{branch.address}</div>}
                {branch.phone && <div className="flex items-center gap-1.5"><Phone size={11} className="flex-shrink-0" />{branch.phone}</div>}
                {branch.email && <div className="flex items-center gap-1.5"><Mail size={11} className="flex-shrink-0" />{branch.email}</div>}
                {!branch.address && !branch.phone && !branch.email && (
                  <p className="text-slate-300 italic text-xs">Sin información de contacto</p>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="border-t border-slate-50 px-5 py-3 grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <Users size={13} className="text-slate-400" />
                <div>
                  <p className="text-[10px] text-slate-400">Usuarios</p>
                  <p className="text-sm font-semibold text-slate-700">{branch.usersCount}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Users2 size={13} className="text-slate-400" />
                <div>
                  <p className="text-[10px] text-slate-400">Empleados</p>
                  <p className="text-sm font-semibold text-slate-700">{branch.employeesCount}</p>
                </div>
              </div>
            </div>

            {/* Sales stats */}
            <div className="border-t border-slate-50 px-5 py-3 grid grid-cols-2 gap-3 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <TrendingUp size={13} className="text-green-500" />
                <div>
                  <p className="text-[10px] text-slate-400">Ventas hoy</p>
                  <p className="text-sm font-semibold text-green-600">{formatCurrency(branch.salesToday)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp size={13} className="text-blue-400" />
                <div>
                  <p className="text-[10px] text-slate-400">Este mes</p>
                  <p className="text-sm font-semibold text-blue-600">{formatCurrency(branch.salesMonth)}</p>
                </div>
              </div>
            </div>
          </div>
        ))}

        {branches.length === 0 && (
          <div className="col-span-3 text-center py-12 text-slate-400">
            <GitBranch size={32} className="mx-auto mb-3 text-slate-300" />
            <p>No hay sucursales registradas</p>
          </div>
        )}
      </div>

      {/* Modal: crear / editar */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <form onSubmit={save} className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">
              {editing ? 'Editar Sucursal' : 'Nueva Sucursal'}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Nombre *</label>
                <input required placeholder="Ej: Sucursal Santiago" value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Dirección</label>
                <input placeholder="Av. 27 de Febrero #123, Santiago" value={form.address}
                  onChange={e => setForm({ ...form, address: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Teléfono</label>
                  <input placeholder="809-000-0000" value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                  <input type="email" placeholder="sucursal@empresa.com" value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            </div>

            {!editing && (
              <div className="mt-4 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 flex items-start gap-2">
                <Info size={14} className="text-blue-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-600">
                  Al agregar una segunda sucursal, tu plan pasará a <strong>Plan Multi-Sucursal</strong>.
                </p>
              </div>
            )}

            <div className="flex gap-2 mt-5">
              <button type="submit" disabled={saving}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
              <button type="button" onClick={resetForm} className="flex-1 border border-slate-200 py-2 rounded-lg text-sm">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
