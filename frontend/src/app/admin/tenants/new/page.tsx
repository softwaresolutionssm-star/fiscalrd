'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { toast } from 'sonner';
import { PageHeader } from '@/components/ui/page-header';
import { ArrowLeft, Building2, User, Save, Eye, EyeOff, CreditCard, GitBranch } from 'lucide-react';
import Link from 'next/link';

const BUSINESS_TYPES = [
  { value: 'ferreteria',   label: 'Ferretería / Materiales',    emoji: '🔧' },
  { value: 'colmado',      label: 'Colmado / Mini Market',       emoji: '🛒' },
  { value: 'supermercado', label: 'Supermercado',                emoji: '🏪' },
  { value: 'farmacia',     label: 'Farmacia / Droguería',        emoji: '💊' },
  { value: 'restaurante',  label: 'Restaurante / Cafetería',     emoji: '🍽️' },
  { value: 'ropa',         label: 'Tienda de Ropa / Calzado',    emoji: '👗' },
  { value: 'salon',        label: 'Salón de Belleza / Barbería', emoji: '💇' },
  { value: 'taller',       label: 'Taller Mecánico / Eléctrico', emoji: '🚗' },
  { value: 'tecnologia',   label: 'Tecnología / Electrónica',    emoji: '💻' },
  { value: 'servicios',    label: 'Empresa de Servicios',        emoji: '🏢' },
  { value: 'constructora', label: 'Constructora / Inmobiliaria', emoji: '🏗️' },
  { value: 'importadora',  label: 'Importadora / Distribuidora', emoji: '📦' },
  { value: 'consultorio',  label: 'Consultorio Médico / Dental', emoji: '🏥' },
  { value: 'educacion',    label: 'Centro Educativo / Academia', emoji: '🎓' },
  { value: 'hotel',        label: 'Hotel / Hostal',              emoji: '🏨' },
  { value: 'transporte',   label: 'Transporte / Mudanzas',       emoji: '🚛' },
  { value: 'agropecuario', label: 'Agropecuario / Ganadería',    emoji: '🌾' },
  { value: 'bar',          label: 'Bar / Discoteca',             emoji: '🍺' },
  { value: 'joyeria',      label: 'Joyería / Óptica',            emoji: '💍' },
  { value: 'panaderia',    label: 'Panadería / Repostería',      emoji: '🥖' },
  { value: 'otro',         label: 'Otro tipo de negocio',        emoji: '🏬' },
];

const DEFAULT_PLAN_PRICES: Record<string, number> = {
  free: 0, basic: 2500, pro: 4500, enterprise: 5500,
};
const PLAN_LIMITS: Record<string, string> = {
  free: '50 facturas/mes', basic: '500 facturas/mes', pro: '2,000 facturas/mes', enterprise: 'Ilimitado',
};
const PLAN_LABELS_MAP: Record<string, string> = {
  free: 'Gratis', basic: 'Básico', pro: 'Pro', enterprise: 'Empresarial',
};

const BRANCH_OPTIONS = [
  { count: 1,   label: '1 Sucursal',    short: 'Una' },
  { count: 2,   label: '2 Sucursales',  short: 'Dos' },
  { count: 3,   label: '3 Sucursales',  short: 'Tres' },
  { count: 4,   label: '4 Sucursales',  short: 'Cuatro' },
  { count: 5,   label: '5 Sucursales',  short: 'Cinco' },
  { count: 6,   label: '6 Sucursales',  short: 'Seis' },
  { count: 10,  label: '10 Sucursales', short: 'Diez' },
  { count: 999, label: 'Ilimitado',     short: 'Sin límite' },
];

function fmtPrice(n: number) {
  return 'RD$' + n.toLocaleString('es-DO') + '/mes';
}

interface FormData {
  businessName: string;
  rnc: string;
  businessEmail: string;
  phone: string;
  address: string;
  businessType: string;
  plan: string;
  ownerFirstName: string;
  ownerLastName: string;
  ownerEmail: string;
  ownerPassword: string;
}

export default function NewTenantPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [maxBranches, setMaxBranches] = useState(1);
  const [planPrices, setPlanPrices] = useState<Record<string, number>>(DEFAULT_PLAN_PRICES);

  useEffect(() => {
    // Fetch real configured prices from the platform settings
    api.get('/admin/settings').then(r => {
      const s = r.data?.data ?? r.data;
      if (s) {
        setPlanPrices({
          free:       0,
          basic:      s.plan_price_basic      ? Number(s.plan_price_basic)      : DEFAULT_PLAN_PRICES.basic,
          pro:        s.plan_price_pro        ? Number(s.plan_price_pro)        : DEFAULT_PLAN_PRICES.pro,
          enterprise: s.plan_price_enterprise ? Number(s.plan_price_enterprise) : DEFAULT_PLAN_PRICES.enterprise,
        });
      }
    }).catch(() => {});
  }, []);

  /**
   * Total mensual = planPrice × maxBranches
   * Para maxBranches=999 (ilimitado) mostramos por sucursal como referencia
   */
  const totalForPlan = (planValue: string, branches: number): number => {
    const base = planPrices[planValue] ?? 0;
    if (branches === 999) return base; // ilimitado: mostramos precio base × 1 suc como referencia
    return base * branches;
  };
  const [form, setForm] = useState<FormData>({
    businessName: '',
    rnc: '',
    businessEmail: '',
    phone: '',
    address: '',
    businessType: '',
    plan: 'basic',
    ownerFirstName: '',
    ownerLastName: '',
    ownerEmail: '',
    ownerPassword: '',
  });

  const set = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.rnc.length !== 9) {
      toast.error('El RNC debe tener exactamente 9 dígitos');
      return;
    }
    if (form.ownerPassword.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        businessName: form.businessName,
        rnc: form.rnc,
        businessEmail: form.businessEmail,
        ownerFirstName: form.ownerFirstName,
        ownerLastName: form.ownerLastName,
        ownerEmail: form.ownerEmail,
        ownerPassword: form.ownerPassword,
      };
      if (form.phone) payload.phone = form.phone;
      if (form.address) payload.address = form.address;
      payload.plan = form.plan;
      if (form.businessType) payload.businessType = form.businessType;
      payload.maxBranches = maxBranches;

      await api.post('/admin/tenants', payload);
      toast.success('Negocio creado exitosamente');
      router.push('/admin/tenants');
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg ?? 'Error al crear negocio');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Nuevo Negocio"
        description="Crear un nuevo negocio cliente en la plataforma"
        action={
          <Link
            href="/admin/tenants"
            className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft size={16} />
            Volver a Negocios
          </Link>
        }
      />

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        {/* Business Info */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="bg-red-50 p-2 rounded-lg">
              <Building2 size={18} className="text-red-600" />
            </div>
            <h2 className="font-semibold text-slate-800">Información del Negocio</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">
                Nombre del Negocio <span className="text-red-500">*</span>
              </label>
              <input
                required
                value={form.businessName}
                onChange={set('businessName')}
                placeholder="Ej: Ferretería El Progreso SRL"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">
                  RNC <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  value={form.rnc}
                  onChange={set('rnc')}
                  maxLength={9}
                  placeholder="123456789"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-500/30"
                />
                <p className="text-xs text-slate-400 mt-1">{form.rnc.length}/9 dígitos</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">
                  Email del Negocio <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="email"
                  value={form.businessEmail}
                  onChange={set('businessEmail')}
                  placeholder="contacto@negocio.do"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Teléfono</label>
                <input
                  value={form.phone}
                  onChange={set('phone')}
                  placeholder="809-000-0000"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Dirección</label>
                <input
                  value={form.address}
                  onChange={set('address')}
                  placeholder="Calle principal #1, Santo Domingo"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Owner Info */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="bg-blue-50 p-2 rounded-lg">
              <User size={18} className="text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-800">Cuenta del Propietario</h2>
              <p className="text-xs text-slate-400">Este usuario tendrá acceso completo al negocio</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  value={form.ownerFirstName}
                  onChange={set('ownerFirstName')}
                  placeholder="Pedro"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">
                  Apellido <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  value={form.ownerLastName}
                  onChange={set('ownerLastName')}
                  placeholder="González"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">
                Email de acceso <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="email"
                value={form.ownerEmail}
                onChange={set('ownerEmail')}
                placeholder="pedro@ferreteria.do"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">
                Contraseña inicial <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  required
                  type={showPassword ? 'text' : 'password'}
                  value={form.ownerPassword}
                  onChange={set('ownerPassword')}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Comparte esta contraseña con el propietario para que pueda ingresar
              </p>
            </div>
          </div>
        </div>

        {/* Business Type */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-slate-100 p-2 rounded-lg">
              <span className="text-lg">🏬</span>
            </div>
            <div>
              <h2 className="font-semibold text-slate-800">Tipo de Negocio</h2>
              <p className="text-xs text-slate-400">El dashboard se personalizará según el tipo</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4">
            {BUSINESS_TYPES.map((bt) => (
              <button
                key={bt.value}
                type="button"
                onClick={() => setForm(prev => ({ ...prev, businessType: bt.value }))}
                className={`flex items-center gap-2 px-3 py-2.5 border rounded-xl text-left transition-all text-sm ${
                  form.businessType === bt.value
                    ? 'border-red-500 bg-red-50 text-red-700 font-medium'
                    : 'border-slate-200 hover:border-slate-300 text-slate-600'
                }`}
              >
                <span className="text-base">{bt.emoji}</span>
                <span className="truncate text-xs">{bt.label}</span>
              </button>
            ))}
          </div>
          {!form.businessType && (
            <p className="text-xs text-amber-600 mt-2">Selecciona el tipo de negocio</p>
          )}
        </div>

        {/* Plan unificado: sucursales + suscripción */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="bg-green-50 p-2 rounded-lg">
              <CreditCard size={18} className="text-green-600" />
            </div>
            <h2 className="font-semibold text-slate-800">Plan</h2>
          </div>

          {/* Paso 1: sucursales */}
          <div>
            <p className="text-sm font-medium text-slate-600 mb-3 flex items-center gap-2">
              <GitBranch size={14} className="text-slate-400" />
              ¿Cuántas sucursales tiene el negocio?
            </p>
            <div className="flex flex-wrap gap-2">
              {BRANCH_OPTIONS.map(opt => (
                <button
                  key={opt.count}
                  type="button"
                  onClick={() => setMaxBranches(opt.count)}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-all font-medium ${
                    maxBranches === opt.count
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Paso 2: plan */}
          <div>
            <p className="text-sm font-medium text-slate-600 mb-3">
              Selecciona el plan de facturación:
              {maxBranches > 1 && (
                <span className="ml-2 text-xs text-indigo-600 font-normal">
                  precio × {maxBranches === 999 ? 'sucursales activas' : `${maxBranches} sucursales`}
                </span>
              )}
            </p>
            <div className="grid grid-cols-2 gap-3">
              {Object.keys(planPrices).filter(p => p !== 'free' || maxBranches <= 1).map(planValue => {
                const selected = form.plan === planValue;
                const total = totalForPlan(planValue, maxBranches);
                const base = planPrices[planValue] ?? 0;
                return (
                  <button
                    key={planValue}
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, plan: planValue }))}
                    className={`border rounded-xl p-4 text-left transition-all ${
                      selected ? 'border-red-500 bg-red-50' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <p className={`font-semibold text-sm ${selected ? 'text-red-700' : 'text-slate-800'}`}>
                      {PLAN_LABELS_MAP[planValue]}
                    </p>
                    <p className={`text-lg font-bold mt-0.5 ${selected ? 'text-red-600' : 'text-slate-700'}`}>
                      {total === 0 ? 'Gratis' : fmtPrice(total)}
                    </p>
                    {maxBranches > 1 && base > 0 && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        RD${base.toLocaleString('es-DO')}/suc
                        {maxBranches !== 999 && ` × ${maxBranches}`}
                      </p>
                    )}
                    <p className="text-xs text-slate-400 mt-1">{PLAN_LIMITS[planValue]}</p>
                  </button>
                );
              })}
            </div>
            {maxBranches > 1 && form.plan && (planPrices[form.plan] ?? 0) > 0 && (
              <div className="mt-3 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 flex items-center justify-between text-sm">
                <span className="text-slate-500">Total mensual estimado:</span>
                <span className="font-bold text-slate-800">{fmtPrice(totalForPlan(form.plan, maxBranches))}</span>
              </div>
            )}
          </div>

          <p className="text-xs text-slate-400">
            El dueño podrá crear sus sucursales desde su panel hasta el límite seleccionado. Puedes ajustarlo desde el detalle del negocio en cualquier momento.
          </p>
        </div>

        {/* Summary box */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700">
          <p className="font-medium mb-1">Al crear este negocio se configurará automáticamente:</p>
          <ul className="list-disc list-inside space-y-0.5 text-blue-600 text-xs">
            <li>Cuenta de propietario con acceso completo al dashboard</li>
            <li>Secuencias e-CF: E31, E32, E33, E34, E41, E43, E44, E45 (Ley 32-23)</li>
            <li>Modo sandbox Alanube activado por defecto (sin costo hasta configurar producción)</li>
            <li>Acceso inmediato al sistema de facturación electrónica</li>
          </ul>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 bg-red-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save size={15} />
          {saving ? 'Creando negocio...' : 'Crear Negocio'}
        </button>
      </form>
    </div>
  );
}
