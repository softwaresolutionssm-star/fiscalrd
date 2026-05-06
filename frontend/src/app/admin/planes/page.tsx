'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/ui/page-header';
import { Check, Edit3, X, Save, GitBranch } from 'lucide-react';


interface PlanLimit {
  maxUsers: number;
  maxInvoicesPerMonth: number;
  maxProducts: number;
  priceRD: number; // Price in Dominican Pesos
  modules: string[];
}

const MODULE_LABELS: Record<string, string> = {
  pos: 'Punto de Venta (POS)',
  inventory: 'Inventario',
  sales: 'Ventas y Facturación',
  customers: 'Gestión de Clientes',
  reports: 'Reportes Básicos',
  advanced_reports: 'Reportes Avanzados',
  ncf_ecf: 'NCF / e-CF (DGII)',
  credit_notes: 'Notas de Crédito',
  multi_user: 'Multi-Usuario',
  api_access: 'Acceso API',
  alanube: 'Integración Alanube',
  cash_register: 'Control de Caja',
  credit_sales: 'Ventas a Crédito',
  barcode: 'Lector de Código de Barras',
  email_notifications: 'Notificaciones por Email',
  priority_support: 'Soporte Prioritario',
};

const DEFAULT_PLANS: Record<string, PlanLimit> = {
  free: {
    maxUsers: 2,
    maxInvoicesPerMonth: 50,
    maxProducts: 100,
    priceRD: 0,
    modules: ['pos', 'inventory', 'sales', 'customers', 'reports', 'ncf_ecf', 'cash_register'],
  },
  basic: {
    maxUsers: 5,
    maxInvoicesPerMonth: 500,
    maxProducts: 500,
    priceRD: 1500,
    modules: ['pos', 'inventory', 'sales', 'customers', 'reports', 'ncf_ecf', 'credit_notes', 'multi_user', 'cash_register', 'credit_sales', 'barcode', 'email_notifications'],
  },
  pro: {
    maxUsers: 15,
    maxInvoicesPerMonth: 2000,
    maxProducts: 2000,
    priceRD: 3500,
    modules: ['pos', 'inventory', 'sales', 'customers', 'reports', 'advanced_reports', 'ncf_ecf', 'credit_notes', 'multi_user', 'cash_register', 'credit_sales', 'barcode', 'email_notifications', 'alanube'],
  },
  enterprise: {
    maxUsers: 999,
    maxInvoicesPerMonth: 999999,
    maxProducts: 999999,
    priceRD: 8000,
    modules: ['pos', 'inventory', 'sales', 'customers', 'reports', 'advanced_reports', 'ncf_ecf', 'credit_notes', 'multi_user', 'api_access', 'alanube', 'cash_register', 'credit_sales', 'barcode', 'email_notifications', 'priority_support'],
  },
};

const PLAN_META: Record<string, { label: string; color: string; headerBg: string; badge: string }> = {
  free:       { label: 'Gratis',      color: 'border-slate-200',  headerBg: 'bg-slate-50',    badge: 'bg-slate-100 text-slate-600' },
  basic:      { label: 'Básico',      color: 'border-blue-200',   headerBg: 'bg-blue-50',     badge: 'bg-blue-100 text-blue-700' },
  pro:        { label: 'Pro',         color: 'border-purple-200', headerBg: 'bg-purple-50',   badge: 'bg-purple-100 text-purple-700' },
  enterprise: { label: 'Empresarial', color: 'border-amber-200',  headerBg: 'bg-amber-50',    badge: 'bg-amber-100 text-amber-700' },
};

const ALL_MODULES = Object.keys(MODULE_LABELS);

export default function AdminPlanesPage() {
  const [plans, setPlans] = useState<Record<string, PlanLimit>>(DEFAULT_PLANS);
  const [editingPlan, setEditingPlan] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<PlanLimit | null>(null);

  const startEdit = (planKey: string) => {
    setEditingPlan(planKey);
    setEditDraft({ ...plans[planKey], modules: [...plans[planKey].modules] });
  };

  const cancelEdit = () => {
    setEditingPlan(null);
    setEditDraft(null);
  };

  const saveEdit = () => {
    if (!editingPlan || !editDraft) return;
    setPlans(prev => ({ ...prev, [editingPlan]: editDraft }));
    toast.success(`Plan ${PLAN_META[editingPlan].label} actualizado`);
    setEditingPlan(null);
    setEditDraft(null);
  };

  const toggleModule = (module: string) => {
    if (!editDraft) return;
    const has = editDraft.modules.includes(module);
    setEditDraft({
      ...editDraft,
      modules: has ? editDraft.modules.filter(m => m !== module) : [...editDraft.modules, module],
    });
  };

  return (
    <div>
      <PageHeader
        title="Planes"
        description="Gestiona los tiers de suscripción disponibles en FiscalRD"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
        {Object.entries(plans).map(([key, plan]) => {
          const meta = PLAN_META[key];
          const isEditing = editingPlan === key;
          const draft = isEditing ? editDraft! : plan;

          return (
            <div key={key} className={`bg-white rounded-2xl border-2 ${meta.color} shadow-sm overflow-hidden flex flex-col`}>
              {/* Header */}
              <div className={`${meta.headerBg} px-5 py-4 border-b ${meta.color}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${meta.badge}`}>
                    {meta.label}
                  </span>
                  {!isEditing ? (
                    <button
                      onClick={() => startEdit(key)}
                      className="text-slate-400 hover:text-slate-700 transition-colors"
                      title="Editar plan"
                    >
                      <Edit3 size={15} />
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <button onClick={saveEdit} className="text-green-600 hover:text-green-700" title="Guardar">
                        <Save size={15} />
                      </button>
                      <button onClick={cancelEdit} className="text-red-500 hover:text-red-600" title="Cancelar">
                        <X size={15} />
                      </button>
                    </div>
                  )}
                </div>

                {isEditing ? (
                  <div className="space-y-1">
                    <input
                      type="number"
                      value={draft.priceRD}
                      onChange={e => setEditDraft({ ...draft, priceRD: Number(e.target.value) })}
                      className="w-full text-2xl font-bold bg-transparent border-b border-slate-300 focus:outline-none focus:border-blue-400"
                    />
                    <p className="text-xs text-slate-500">RD$/mes</p>
                  </div>
                ) : (
                  <>
                    <p className="text-2xl font-bold text-slate-800">
                      {plan.priceRD === 0 ? 'Gratis' : `RD$${plan.priceRD.toLocaleString('es-DO')}`}
                    </p>
                    {plan.priceRD > 0 && <p className="text-xs text-slate-500">por mes</p>}
                  </>
                )}
              </div>

              {/* Limits */}
              <div className="px-5 py-4 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Límites</p>
                <div className="space-y-2.5">
                  {[
                    { label: 'Usuarios', field: 'maxUsers' as const },
                    { label: 'Facturas/mes', field: 'maxInvoicesPerMonth' as const },
                    { label: 'Productos', field: 'maxProducts' as const },
                  ].map(({ label, field }) => (
                    <div key={field} className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">{label}</span>
                      {isEditing ? (
                        <input
                          type="number"
                          value={draft[field]}
                          onChange={e => setEditDraft({ ...draft, [field]: Number(e.target.value) })}
                          className="w-24 text-right text-sm font-semibold border border-slate-200 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
                        />
                      ) : (
                        <span className="text-sm font-semibold text-slate-800">
                          {plan[field] >= 999999 ? 'Ilimitado' : plan[field].toLocaleString('es-DO')}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Modules */}
              <div className="px-5 py-4 flex-1">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Módulos</p>
                <ul className="space-y-1.5">
                  {ALL_MODULES.map(mod => {
                    const included = draft.modules.includes(mod);
                    if (!isEditing && !included) return null;
                    return (
                      <li
                        key={mod}
                        onClick={() => isEditing && toggleModule(mod)}
                        className={`flex items-center gap-2 text-sm ${isEditing ? 'cursor-pointer select-none' : ''}`}
                      >
                        <span className={`flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center ${
                          included ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-300'
                        }`}>
                          {included ? <Check size={10} /> : <X size={9} />}
                        </span>
                        <span className={included ? 'text-slate-700' : 'text-slate-400 line-through'}>
                          {MODULE_LABELS[mod]}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Sección: Precios Multi-Sucursal ─────────────────────────────── */}
      <div className="mt-8">
        <div className="flex items-center gap-2 mb-4">
          <GitBranch size={18} className="text-indigo-500" />
          <h2 className="text-base font-semibold text-slate-800">Modelo Multi-Sucursal</h2>
        </div>

        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6">
          <p className="text-sm font-semibold text-indigo-800 mb-2">Fórmula de cobro para negocios con sucursales:</p>
          <p className="text-2xl font-bold text-indigo-700 mb-3">
            Total = Precio del Plan × Número de Sucursales
          </p>
          <div className="grid grid-cols-3 gap-4 text-sm text-indigo-700 mt-4">
            {[
              { plan: 'Básico', price: 2500, n: 2, total: 5000 },
              { plan: 'Pro', price: 4500, n: 3, total: 13500 },
              { plan: 'Empresarial', price: 5500, n: 4, total: 22000 },
            ].map(ex => (
              <div key={ex.plan} className="bg-white border border-indigo-100 rounded-xl px-4 py-3 text-center">
                <p className="text-xs text-indigo-400 mb-1">Ejemplo: {ex.plan}</p>
                <p className="text-xs text-indigo-600">
                  RD${ex.price.toLocaleString('es-DO')} × {ex.n} suc.
                </p>
                <p className="text-base font-bold text-indigo-800 mt-0.5">
                  = RD${ex.total.toLocaleString('es-DO')}/mes
                </p>
              </div>
            ))}
          </div>
          <p className="text-xs text-indigo-400 mt-4">
            Los precios de los planes son configurables arriba. Puedes aplicar descuentos individuales desde el detalle de cada negocio.
          </p>
        </div>
      </div>

      <p className="mt-6 text-xs text-slate-400 text-center">
        Los cambios en planes afectan nuevas suscripciones. Los negocios existentes mantienen su plan hasta renovación.
      </p>
    </div>
  );
}
