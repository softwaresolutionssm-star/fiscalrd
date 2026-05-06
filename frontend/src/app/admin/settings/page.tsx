'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Save, Globe, Zap, Shield, RefreshCw, CreditCard, DollarSign } from 'lucide-react';

interface Settings {
  platform_name: string;
  platform_url: string;
  support_email: string;
  open_registration: string;
  require_approval: string;
  alanube_sandbox: string;
  alanube_api_key_global: string;
  admin_email: string;
  payment_bank_name: string;
  payment_account_number: string;
  payment_account_name: string;
  payment_account_type: string;
  payment_instructions: string;
  plan_price_basic: string;
  plan_price_pro: string;
  plan_price_enterprise: string;
}

const DEFAULTS: Settings = {
  platform_name: 'FiscalRD',
  platform_url: 'https://fiscalrd.do',
  support_email: 'softwaresolutionssm@gmail.com',
  open_registration: 'false',
  require_approval: 'true',
  alanube_sandbox: 'true',
  alanube_api_key_global: '',
  admin_email: 'softwaresolutionssm@gmail.com',
  payment_bank_name: 'Banreservas',
  payment_account_number: '9607453361',
  payment_account_name: 'Saul Mercado',
  payment_account_type: 'Corriente',
  payment_instructions: 'Realiza la transferencia a la cuenta indicada y sube el comprobante desde tu panel de Facturación. Tu pago será revisado en menos de 24 horas.',
  plan_price_basic: '2500',
  plan_price_pro: '4500',
  plan_price_enterprise: '5500',
};

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/admin/settings')
      .then((r) => {
        const data = r.data.data ?? r.data;
        setSettings({ ...DEFAULTS, ...data });
      })
      .catch(() => toast.error('Error cargando configuración'))
      .finally(() => setLoading(false));
  }, []);

  const set = (key: keyof Settings) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setSettings((prev) => ({ ...prev, [key]: e.target.value }));

  const setToggle = (key: keyof Settings) => (val: boolean) =>
    setSettings((prev) => ({ ...prev, [key]: String(val) }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/admin/settings', settings);
      toast.success('Configuración guardada correctamente');
    } catch {
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Configuración de la Plataforma"
        description="Ajustes globales de FiscalRD"
      />

      <div className="grid grid-cols-1 gap-6 max-w-2xl">

        {/* General */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="bg-red-50 p-2 rounded-lg"><Globe size={18} className="text-red-600" /></div>
            <h2 className="font-semibold text-slate-800">General</h2>
          </div>
          <div className="space-y-4">
            <Field label="Nombre de la plataforma" value={settings.platform_name} onChange={set('platform_name')} />
            <Field label="URL de la plataforma" value={settings.platform_url} onChange={set('platform_url')} />
            <Field label="Email de soporte" type="email" value={settings.support_email} onChange={set('support_email')} />
          </div>
        </div>

        {/* Alanube / e-CF */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-purple-50 p-2 rounded-lg"><Zap size={18} className="text-purple-600" /></div>
            <h2 className="font-semibold text-slate-800">Alanube — Facturación Electrónica (e-CF)</h2>
          </div>
          <p className="text-xs text-slate-400 mb-5">
            Configuración global para la transmisión de comprobantes fiscales a la DGII vía Alanube.
            Cada negocio puede tener su propia API key configurada en su perfil.
          </p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Modo</label>
              <div className="flex gap-3">
                <ModeButton
                  active={settings.alanube_sandbox === 'true'}
                  onClick={() => setToggle('alanube_sandbox')(true)}
                  label="Sandbox (desarrollo)"
                  color="yellow"
                />
                <ModeButton
                  active={settings.alanube_sandbox === 'false'}
                  onClick={() => setToggle('alanube_sandbox')(false)}
                  label="Producción (DGII real)"
                  color="green"
                />
              </div>
              {settings.alanube_sandbox === 'true' && (
                <p className="text-xs text-amber-600 mt-1.5 bg-amber-50 px-3 py-1.5 rounded-lg">
                  Modo sandbox: las facturas NO se envían a la DGII real. URL: sandbox.alanube.co
                </p>
              )}
              {settings.alanube_sandbox === 'false' && (
                <p className="text-xs text-green-700 mt-1.5 bg-green-50 px-3 py-1.5 rounded-lg">
                  Modo producción: las facturas se envían a la DGII real. URL: api.alanube.co
                </p>
              )}
            </div>
            <Field
              label="API Key Global de Alanube (opcional)"
              value={settings.alanube_api_key_global}
              onChange={set('alanube_api_key_global')}
              type="password"
              placeholder="Se usa si el negocio no tiene su propia key"
            />
          </div>
        </div>

        {/* Registro */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="bg-blue-50 p-2 rounded-lg"><Shield size={18} className="text-blue-600" /></div>
            <h2 className="font-semibold text-slate-800">Registro de Negocios</h2>
          </div>
          <div className="space-y-4">
            <Toggle
              label="Registro público abierto"
              description="Permitir que nuevos negocios se registren solos en /register"
              value={settings.open_registration === 'true'}
              onChange={setToggle('open_registration')}
            />
            <Toggle
              label="Aprobación manual requerida"
              description="Revisar cada registro antes de activarlo"
              value={settings.require_approval === 'true'}
              onChange={setToggle('require_approval')}
            />
          </div>
        </div>

        {/* Precios de planes */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-amber-50 p-2 rounded-lg"><DollarSign size={18} className="text-amber-600" /></div>
            <h2 className="font-semibold text-slate-800">Precios de Planes</h2>
          </div>
          <p className="text-xs text-slate-400 mb-5">
            Se muestran en la landing page automáticamente. Precios en RD$.
          </p>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Plan Básico (RD$)" value={settings.plan_price_basic} onChange={set('plan_price_basic')} type="number" placeholder="2500" />
            <Field label="Plan Pro (RD$)" value={settings.plan_price_pro} onChange={set('plan_price_pro')} type="number" placeholder="4500" />
            <Field label="Plan Empresarial (RD$)" value={settings.plan_price_enterprise} onChange={set('plan_price_enterprise')} type="number" placeholder="5500" />
          </div>
        </div>

        {/* Pagos a Saul */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-green-50 p-2 rounded-lg"><CreditCard size={18} className="text-green-600" /></div>
            <h2 className="font-semibold text-slate-800">Cobros — Mi Cuenta Bancaria</h2>
          </div>
          <p className="text-xs text-slate-400 mb-5">
            Esta información se muestra a los negocios cuando van a pagar su suscripción mensual.
          </p>
          <div className="space-y-4">
            <Field label="Tu email (para recibir notificaciones de pago)" type="email" value={settings.admin_email} onChange={set('admin_email')} placeholder="tu@email.com" />
            <Field label="Nombre del banco" value={settings.payment_bank_name} onChange={set('payment_bank_name')} placeholder="Ej: Banco Popular Dominicano" />
            <Field label="Número de cuenta" value={settings.payment_account_number} onChange={set('payment_account_number')} placeholder="Ej: 012-345678-9" />
            <Field label="Nombre del titular" value={settings.payment_account_name} onChange={set('payment_account_name')} placeholder="Tu nombre completo o razón social" />
            <Field label="Tipo de cuenta" value={settings.payment_account_type} onChange={set('payment_account_type')} placeholder="Corriente / Ahorros" />
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Instrucciones adicionales para el negocio</label>
              <textarea
                value={settings.payment_instructions}
                onChange={set('payment_instructions')}
                rows={3}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 resize-none"
                placeholder="Instrucciones para el pago..."
              />
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-red-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors w-fit disabled:opacity-50"
        >
          {saving ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
          {saving ? 'Guardando...' : 'Guardar Configuración'}
        </button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder }: {
  label: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-600 mb-1">{label}</label>
      <input
        type={type} value={value} onChange={onChange} placeholder={placeholder}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30"
      />
    </div>
  );
}

function Toggle({ label, description, value, onChange }: {
  label: string; description: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-slate-700">{label}</p>
        <p className="text-xs text-slate-400">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${value ? 'bg-red-600' : 'bg-slate-200'}`}
      >
        <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}

function ModeButton({ active, onClick, label, color }: {
  active: boolean; onClick: () => void; label: string; color: 'yellow' | 'green';
}) {
  const colors = {
    yellow: active ? 'bg-amber-100 border-amber-400 text-amber-700' : 'bg-white border-slate-200 text-slate-500',
    green: active ? 'bg-green-100 border-green-400 text-green-700' : 'bg-white border-slate-200 text-slate-500',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 border rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${colors[color]}`}
    >
      {label}
    </button>
  );
}
