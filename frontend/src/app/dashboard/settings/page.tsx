'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import api from '@/lib/api';
import { toast } from 'sonner';
import { PageHeader } from '@/components/ui/page-header';
import { Building2, FileText, Lock, Eye, EyeOff, CheckCircle2, Globe, Phone, Mail, MapPin, Hash } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TenantData {
  businessName: string;
  rnc: string;
  businessType: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  regime: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BUSINESS_TYPE_OPTIONS = [
  { value: 'ferreteria',   label: 'Ferretería' },
  { value: 'colmado',      label: 'Colmado' },
  { value: 'restaurante',  label: 'Restaurante' },
  { value: 'farmacia',     label: 'Farmacia' },
  { value: 'salon',        label: 'Salón' },
  { value: 'taller',       label: 'Taller' },
  { value: 'constructora', label: 'Constructora' },
  { value: 'importadora',  label: 'Importadora' },
  { value: 'servicios',    label: 'Servicios' },
  { value: 'consultorio',  label: 'Consultorio' },
  { value: 'supermercado', label: 'Supermercado' },
  { value: 'otro',         label: 'Otro' },
];

const REGIME_OPTIONS = [
  { value: 'ORDINARIO',   label: 'Ordinario' },
  { value: 'SIMPLIFIED',  label: 'Simplificado' },
  { value: 'MICRO',       label: 'Micro Empresa' },
];

// ─── Shared input className ───────────────────────────────────────────────────

const INPUT_CLS = 'w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 bg-white';
const INPUT_READONLY_CLS = 'w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-700 cursor-default';
const SELECT_CLS = `${INPUT_CLS} cursor-pointer`;

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="animate-pulse space-y-6">
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-4">
          <div className="h-5 bg-slate-200 rounded w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(j => (
              <div key={j} className="space-y-2">
                <div className="h-3.5 bg-slate-200 rounded w-24" />
                <div className="h-10 bg-slate-100 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { user } = useAuth();
  const isReadOnly = user?.role === 'manager';

  // ── Business info state ──────────────────────────────────────────────────
  const [form, setForm] = useState<TenantData>({
    businessName: '',
    rnc: '',
    businessType: 'otro',
    address: '',
    phone: '',
    email: '',
    website: '',
    regime: 'ORDINARIO',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ── Password state ───────────────────────────────────────────────────────
  const [currentPassword, setCurrentPassword]   = useState('');
  const [newPassword, setNewPassword]           = useState('');
  const [confirmPassword, setConfirmPassword]   = useState('');
  const [showCurrent, setShowCurrent]           = useState(false);
  const [showNew, setShowNew]                   = useState(false);
  const [savingPwd, setSavingPwd]               = useState(false);

  // ── Load tenant data ─────────────────────────────────────────────────────
  useEffect(() => {
    api.get('/tenants/me')
      .then(r => {
        const d = r.data?.data ?? r.data;
        setForm({
          businessName: d.businessName ?? '',
          rnc:          d.rnc          ?? '',
          businessType: d.businessType ?? 'otro',
          address:      d.address      ?? '',
          phone:        d.phone        ?? '',
          email:        d.email        ?? '',
          website:      d.website      ?? '',
          regime:       d.regime       ?? 'ORDINARIO',
        });
      })
      .catch(() => toast.error('No se pudo cargar la información del negocio'))
      .finally(() => setLoading(false));
  }, []);

  // ── Helpers ──────────────────────────────────────────────────────────────
  function set<K extends keyof TenantData>(key: K, value: TenantData[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  // ── Save business + fiscal info ──────────────────────────────────────────
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (form.rnc && !/^\d{9}$/.test(form.rnc)) {
      toast.error('El RNC debe tener exactamente 9 dígitos');
      return;
    }
    setSaving(true);
    try {
      await api.patch('/tenants/me', {
        businessName: form.businessName,
        rnc:          form.rnc,
        businessType: form.businessType,
        address:      form.address,
        phone:        form.phone,
        email:        form.email,
        website:      form.website || undefined,
        regime:       form.regime,
      });
      toast.success('Cambios guardados correctamente');
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Error al guardar los cambios');
    } finally {
      setSaving(false);
    }
  }

  // ── Change password ──────────────────────────────────────────────────────
  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) { toast.error('La nueva contraseña debe tener al menos 6 caracteres'); return; }
    if (newPassword !== confirmPassword) { toast.error('Las contraseñas no coinciden'); return; }
    setSavingPwd(true);
    try {
      await api.patch('/auth/change-password', { currentPassword, newPassword });
      toast.success('Contraseña actualizada correctamente');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Error al cambiar la contraseña');
    } finally {
      setSavingPwd(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div>
        <PageHeader title="Configuración" description="Administra la información y preferencias de tu negocio" />
        <Skeleton />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Configuración" description="Administra la información y preferencias de tu negocio" />

      {isReadOnly && (
        <div className="mb-4 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-sm text-amber-700">
          <Lock size={14} className="flex-shrink-0" />
          Información de solo lectura. Solo el propietario o administrador puede modificar estos datos.
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">

        {/* ── Section 1: Información del Negocio ──────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h3 className="font-semibold text-slate-800 mb-5 flex items-center gap-2">
            <Building2 size={16} className="text-slate-400" />
            Información del Negocio
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Nombre del negocio */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Nombre del negocio
              </label>
              <input
                type="text"
                value={form.businessName}
                readOnly={isReadOnly}
                onChange={isReadOnly ? undefined : e => set('businessName', e.target.value)}
                placeholder="Ej. Ferretería El Progreso"
                className={isReadOnly ? INPUT_READONLY_CLS : INPUT_CLS}
              />
            </div>

            {/* RNC */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Hash size={13} className="text-slate-400" /> RNC del negocio
              </label>
              <input
                type="text"
                value={form.rnc}
                readOnly={isReadOnly}
                onChange={isReadOnly ? undefined : e => set('rnc', e.target.value.replace(/\D/g, '').slice(0, 9))}
                maxLength={9}
                placeholder="123456789"
                className={isReadOnly ? INPUT_READONLY_CLS : INPUT_CLS}
              />
            </div>

            {/* Tipo de negocio */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Tipo de negocio
              </label>
              {isReadOnly ? (
                <div className={INPUT_READONLY_CLS}>
                  {BUSINESS_TYPE_OPTIONS.find(o => o.value === form.businessType)?.label ?? form.businessType}
                </div>
              ) : (
                <select value={form.businessType} onChange={e => set('businessType', e.target.value)} className={SELECT_CLS}>
                  {BUSINESS_TYPE_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Dirección */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
                <MapPin size={13} className="text-slate-400" /> Dirección
              </label>
              <input
                type="text"
                value={form.address}
                readOnly={isReadOnly}
                onChange={isReadOnly ? undefined : e => set('address', e.target.value)}
                placeholder="Calle Principal #1, Santo Domingo"
                className={isReadOnly ? INPUT_READONLY_CLS : INPUT_CLS}
              />
            </div>

            {/* Teléfono */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Phone size={13} className="text-slate-400" /> Teléfono
              </label>
              <input
                type="tel"
                value={form.phone}
                readOnly={isReadOnly}
                onChange={isReadOnly ? undefined : e => set('phone', e.target.value)}
                placeholder="809-000-0000"
                className={isReadOnly ? INPUT_READONLY_CLS : INPUT_CLS}
              />
            </div>

            {/* Email del negocio */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Mail size={13} className="text-slate-400" /> Correo electrónico del negocio
              </label>
              <input
                type="email"
                value={form.email}
                readOnly={isReadOnly}
                onChange={isReadOnly ? undefined : e => set('email', e.target.value)}
                placeholder="info@minegocio.com"
                className={isReadOnly ? INPUT_READONLY_CLS : INPUT_CLS}
              />
            </div>

            {/* Website */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Globe size={13} className="text-slate-400" /> Sitio web
              </label>
              <input
                type="url"
                value={form.website}
                readOnly={isReadOnly}
                onChange={isReadOnly ? undefined : e => set('website', e.target.value)}
                placeholder="https://minegocio.com"
                className={isReadOnly ? INPUT_READONLY_CLS : INPUT_CLS}
              />
            </div>
          </div>
        </div>

        {/* ── Section 2: Información Fiscal ───────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h3 className="font-semibold text-slate-800 mb-5 flex items-center gap-2">
            <FileText size={16} className="text-slate-400" />
            Información Fiscal
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* RNC (read-only reference) */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Hash size={13} className="text-slate-400" /> RNC
              </label>
              <div className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 font-mono">
                {form.rnc || <span className="text-slate-400 italic">Sin RNC configurado</span>}
              </div>
            </div>

            {/* Régimen fiscal */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Régimen fiscal
              </label>
              {isReadOnly ? (
                <div className={INPUT_READONLY_CLS}>
                  {REGIME_OPTIONS.find(o => o.value === form.regime)?.label ?? form.regime}
                </div>
              ) : (
                <select value={form.regime} onChange={e => set('regime', e.target.value)} className={SELECT_CLS}>
                  {REGIME_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>

        {/* ── Save button — oculto para read-only ──────────────────────── */}
        {!isReadOnly && (
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        )}
      </form>

      {/* ── Section 3: Cambiar Contraseña ─────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 mt-6">
        <h3 className="font-semibold text-slate-800 mb-5 flex items-center gap-2">
          <Lock size={16} className="text-slate-400" />
          Cambiar Contraseña
        </h3>

        <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
          {/* Current password */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Contraseña actual</label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full px-3 py-2.5 pr-10 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* New password */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Nueva contraseña</label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Mínimo 6 caracteres"
                className="w-full px-3 py-2.5 pr-10 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
              <button
                type="button"
                onClick={() => setShowNew(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {/* Strength bar */}
            {newPassword && (
              <div className="mt-2 flex gap-1">
                {[1, 2, 3, 4].map(i => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      newPassword.length >= i * 3
                        ? i <= 2 ? 'bg-red-400' : i === 3 ? 'bg-yellow-400' : 'bg-green-500'
                        : 'bg-slate-200'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Confirm password */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirmar nueva contraseña</label>
            <div className="relative">
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                placeholder="Repite la contraseña"
                className="w-full px-3 py-2.5 pr-10 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
              {confirmPassword && newPassword === confirmPassword && (
                <CheckCircle2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500" />
              )}
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={savingPwd || !currentPassword || !newPassword || !confirmPassword}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingPwd ? 'Guardando...' : 'Actualizar Contraseña'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
