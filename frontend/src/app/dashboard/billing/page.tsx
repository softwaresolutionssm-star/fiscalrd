'use client';

import { useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { PageHeader } from '@/components/ui/page-header';
import {
  CreditCard, CheckCircle, Clock, AlertCircle, XCircle, Upload,
  Building2, RefreshCw, Lock, Image, X, Eye,
} from 'lucide-react';

interface PaymentInstructions {
  bankName: string; accountNumber: string; accountName: string;
  accountType: string; instructions: string;
}
interface TenantPayment {
  id: string; period: string; baseAmount: number; lateFeePercent: number;
  lateFeeAmount: number; totalAmount: number; dueDate: string; status: string;
  branchId: string | null; branchName: string | null;
  submittedAt: string | null; bankName: string | null; referenceNumber: string | null;
  transferAmount: number | null; proofNotes: string | null; approvedAt: string | null;
  rejectedAt: string | null; rejectedReason: string | null; adminNotes: string | null;
}
interface BillingData {
  tenant: {
    businessName: string; plan: string;
    maxBranches: number; activeBranches: number;
    planBasePrice: number; discountPct: number;
    isBillingBlocked: boolean; billingNotes: string | null;
  };
  currentPayments: TenantPayment[];
  currentPayment: TenantPayment | null;
  unpaidMonths: TenantPayment[];
  unpaidCount: number;
  history: TenantPayment[];
  instructions: PaymentInstructions;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pending:   { label: 'Pendiente',        color: 'bg-amber-100 text-amber-700',  icon: Clock },
  submitted: { label: 'En revisión',      color: 'bg-blue-100 text-blue-700',    icon: RefreshCw },
  approved:  { label: 'Aprobado',         color: 'bg-green-100 text-green-700',  icon: CheckCircle },
  rejected:  { label: 'Rechazado',        color: 'bg-red-100 text-red-700',      icon: XCircle },
  overdue:   { label: 'Vencido',          color: 'bg-red-100 text-red-800',      icon: AlertCircle },
  waived:    { label: 'Condonado',        color: 'bg-purple-100 text-purple-700',icon: CheckCircle },
};

const PLAN_LABELS: Record<string, string> = {
  free: 'Gratis', basic: 'Básico', pro: 'Pro', enterprise: 'Empresarial',
};

const BANKS_RD = [
  'Banco Popular Dominicano', 'BHD León', 'Banreservas', 'Scotiabank',
  'Banco Santa Cruz', 'Banco BDI', 'Citibank', 'Banco Caribe',
  'Asociación Popular', 'Banco Vimenca', 'Otro',
];

function fmt(d: string | null) {
  if (!d) return '—';
  // Si es solo fecha (YYYY-MM-DD), añadir mediodía para evitar el timezone shift UTC→RD
  const date = d.includes('T') ? new Date(d) : new Date(d + 'T12:00:00');
  return date.toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtMoney(n: number) {
  return `RD$${Number(n).toLocaleString('es-DO', { minimumFractionDigits: 2 })}`;
}

export default function BillingPage() {
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [activePaymentId, setActivePaymentId] = useState<string | null>(null); // which payment we're submitting for
  const [form, setForm] = useState({
    bankName: '', referenceNumber: '', transferAmount: '', proofNotes: '', proofUrl: '',
  });
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [viewingProof, setViewingProof] = useState<string | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('El archivo no debe superar 5 MB');
      return;
    }
    setProofFile(file);
    setProofPreview(URL.createObjectURL(file));
    setForm(f => ({ ...f, proofUrl: '' })); // reset previous URL
  };

  const removeProof = () => {
    setProofFile(null);
    if (proofPreview) URL.revokeObjectURL(proofPreview);
    setProofPreview(null);
    setForm(f => ({ ...f, proofUrl: '' }));
  };

  const load = async () => {
    try {
      const r = await api.get('/billing/my');
      setData(r.data.data ?? r.data);
    } catch {
      toast.error('Error cargando información de facturación');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openSubmitForm = (paymentId: string, baseAmount: number) => {
    setActivePaymentId(paymentId);
    setForm({ bankName: '', referenceNumber: '', transferAmount: String(baseAmount), proofNotes: '', proofUrl: '' });
    setShowForm(true);
    removeProof();
  };

  const handleSubmit = async () => {
    if (!activePaymentId) return;
    if (!form.bankName || !form.referenceNumber || !form.transferAmount) {
      toast.error('Completa todos los campos requeridos');
      return;
    }
    setSubmitting(true);
    try {
      let proofUrl = form.proofUrl;

      // Upload image if selected
      if (proofFile) {
        setUploadingProof(true);
        const fd = new FormData();
        fd.append('file', proofFile);
        const uploadRes = await api.post('/billing/my/upload-proof', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        proofUrl = uploadRes.data?.data?.url ?? uploadRes.data?.url ?? '';
        setUploadingProof(false);
      }

      await api.post('/billing/my/submit', {
        paymentId: activePaymentId,
        bankName: form.bankName,
        referenceNumber: form.referenceNumber,
        transferAmount: parseFloat(form.transferAmount),
        proofNotes: form.proofNotes || undefined,
        proofUrl: proofUrl || undefined,
      });
      toast.success('Comprobante enviado. Esperando aprobación.');
      setShowForm(false);
      setActivePaymentId(null);
      setForm({ bankName: '', referenceNumber: '', transferAmount: '', proofNotes: '', proofUrl: '' });
      removeProof();
      load();
    } catch (e: any) {
      setUploadingProof(false);
      toast.error(e?.response?.data?.message ?? 'Error al enviar comprobante');
    } finally {
      setSubmitting(false);
    }
  };

  // Extract unique branches from history for the filter dropdown
  // Must be before early returns to satisfy Rules of Hooks
  const history = data?.history ?? [];
  const historyBranches = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of history) {
      const key = p.branchId ?? '__null__';
      if (!map.has(key)) map.set(key, p.branchName ?? 'Principal');
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [history]);

  const filteredHistory = selectedBranchId
    ? history.filter(p => {
        if (selectedBranchId === '__null__') return p.branchId === null;
        return p.branchId === selectedBranchId;
      })
    : history;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
    </div>
  );

  if (!data) return null;

  const { tenant, currentPayments = [], currentPayment, unpaidMonths, unpaidCount, instructions } = data;
  const paymentsThisMonth: TenantPayment[] = currentPayments.length > 0
    ? currentPayments
    : (currentPayment ? [currentPayment] : []);
  const hasMultiBranch = (tenant.maxBranches ?? 1) > 1;

  const StatusBadge = ({ status }: { status: string }) => {
    const cfg = STATUS_CONFIG[status] ?? { label: status, color: 'bg-slate-100 text-slate-600', icon: Clock };
    const Icon = cfg.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
        <Icon size={12} /> {cfg.label}
      </span>
    );
  };

  return (
    <div>
      <PageHeader
        title="Mi Suscripción"
        description="Gestiona el pago de tu plan FiscalRD"
      />

      {/* Banner meses atrasados */}
      {unpaidCount > 0 && !tenant.isBillingBlocked && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <AlertCircle size={22} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-red-800 text-base">
                Tienes {unpaidCount} {unpaidCount === 1 ? 'mes' : 'meses'} vencido{unpaidCount !== 1 ? 's' : ''} sin pagar
              </p>
              <p className="text-red-600 text-sm mt-1">
                Si acumulas 3 meses sin pagar, tu cuenta será bloqueada automáticamente.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {unpaidMonths.map(p => (
                  <button
                    key={p.id}
                    onClick={() => openSubmitForm(p.id, p.totalAmount)}
                    className="bg-red-100 hover:bg-red-200 text-red-700 text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-colors"
                  >
                    <Upload size={11} />
                    {p.branchName && <span className="opacity-75">[{p.branchName}]</span>}
                    {p.period} — {fmtMoney(p.totalAmount)}
                    {p.lateFeeAmount > 0 && <span className="opacity-75">(+{p.lateFeePercent}% mora)</span>}
                  </button>
                ))}
              </div>
              <p className="text-xs text-red-500 mt-2">Haz clic en cada mes para enviar su comprobante.</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xs text-red-500 mb-1">Total adeudado</p>
              <p className="text-xl font-black text-red-700">
                {fmtMoney(unpaidMonths.reduce((s, p) => s + Number(p.totalAmount), 0))}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Banner de bloqueo */}
      {tenant.isBillingBlocked && (
        <div className="mb-6 bg-red-600 text-white rounded-xl p-5 flex items-center gap-4">
          <Lock size={28} className="flex-shrink-0" />
          <div>
            <p className="font-bold text-lg">Cuenta Bloqueada</p>
            <p className="text-red-100 text-sm mt-0.5">
              Tu cuenta está bloqueada por falta de pago. Envía tu comprobante abajo para regularizarte.
            </p>
            {tenant.billingNotes && <p className="text-red-200 text-xs mt-1">{tenant.billingNotes}</p>}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Pagos del mes actual — uno por sucursal */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <CreditCard size={15} className="text-slate-400" /> Pago{paymentsThisMonth.length !== 1 ? 's' : ''} del Mes Actual
          </h2>

          {/* Resumen total (multi-sucursal) */}
          {hasMultiBranch && paymentsThisMonth.length > 0 && (
            <div className="bg-slate-800 rounded-xl p-4 text-white flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Total del período {paymentsThisMonth[0]?.period}</p>
                <p className="text-xs text-slate-300">
                  Plan {PLAN_LABELS[tenant.plan] ?? tenant.plan} × {tenant.maxBranches} sucursales
                  {(tenant.discountPct ?? 0) > 0 && <span className="text-green-400 ml-1">− {tenant.discountPct}% dto.</span>}
                </p>
              </div>
              <p className="text-2xl font-black">
                {fmtMoney(paymentsThisMonth.reduce((s, p) => s + Number(p.totalAmount), 0))}
              </p>
            </div>
          )}

          {paymentsThisMonth.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 text-center text-slate-400">
              <CheckCircle size={32} className="mx-auto mb-2 text-green-400" />
              <p className="font-medium text-slate-600">Plan Gratis — sin cobro</p>
              <p className="text-sm mt-1">Actualiza tu plan para acceder a más funcionalidades</p>
            </div>
          ) : paymentsThisMonth.map(p => (
            <div key={p.id} className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  {p.branchName && (
                    <p className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-0.5 flex items-center gap-1">
                      <Building2 size={11} /> {p.branchName}
                    </p>
                  )}
                  <p className="text-xs text-slate-500">Período <span className="font-medium text-slate-700">{p.period}</span></p>
                </div>
                <StatusBadge status={p.status} />
              </div>

              <div className="bg-slate-50 rounded-xl p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Plan {PLAN_LABELS[tenant.plan] ?? tenant.plan}</span>
                  <span className="font-medium">{fmtMoney(p.baseAmount)}</span>
                </div>
                {p.lateFeeAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-red-500">Recargo mora ({p.lateFeePercent}%)</span>
                    <span className="font-medium text-red-600">+{fmtMoney(p.lateFeeAmount)}</span>
                  </div>
                )}
                <div className="border-t pt-2 flex justify-between font-bold text-sm">
                  <span>Total</span>
                  <span className="text-slate-900">{fmtMoney(p.totalAmount)}</span>
                </div>
              </div>

              <div className="flex justify-between text-xs text-slate-500">
                <span>Fecha límite</span>
                <span className="font-medium text-slate-700">{fmt(p.dueDate)}</span>
              </div>

              {p.status === 'rejected' && p.rejectedReason && (
                <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-xs text-red-700">
                  <strong>Motivo del rechazo:</strong> {p.rejectedReason}
                </div>
              )}
              {p.status === 'submitted' && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700 flex items-center justify-between">
                  <span>Comprobante enviado el {fmt(p.submittedAt)}. Esperando aprobación.</span>
                  {(p as any).proofUrl && (
                    <button onClick={() => setViewingProof((p as any).proofUrl)} className="flex items-center gap-1 border border-blue-300 px-2 py-1 rounded hover:bg-blue-100 ml-2 flex-shrink-0">
                      <Eye size={11} /> Ver
                    </button>
                  )}
                </div>
              )}
              {p.status === 'approved' && (
                <div className="bg-green-50 border border-green-100 rounded-lg p-3 text-xs text-green-700 flex items-center justify-between">
                  <span>Aprobado el {fmt(p.approvedAt)}.</span>
                  {(p as any).proofUrl && (
                    <button onClick={() => setViewingProof((p as any).proofUrl)} className="flex items-center gap-1 border border-green-300 px-2 py-1 rounded hover:bg-green-100 ml-2 flex-shrink-0">
                      <Eye size={11} /> Ver
                    </button>
                  )}
                </div>
              )}

              {['pending', 'rejected', 'overdue'].includes(p.status) && !(showForm && activePaymentId === p.id) && (
                <button
                  onClick={() => openSubmitForm(p.id, p.totalAmount)}
                  className="w-full flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                >
                  <Upload size={14} /> Enviar Comprobante
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Instrucciones de pago */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <Building2 size={15} className="text-slate-400" /> Datos para Transferencia
          </h2>
          {instructions.bankName ? (
            <div className="space-y-3">
              {[
                { label: 'Banco', value: instructions.bankName },
                { label: 'Tipo de cuenta', value: instructions.accountType },
                { label: 'Número de cuenta', value: instructions.accountNumber, mono: true },
                { label: 'Nombre', value: instructions.accountName },
              ].map(row => (
                <div key={row.label} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                  <span className="text-xs text-slate-500">{row.label}</span>
                  <span className={`text-sm font-semibold text-slate-800 ${row.mono ? 'font-mono' : ''}`}>
                    {row.value || '—'}
                  </span>
                </div>
              ))}
              {instructions.instructions && (
                <p className="text-xs text-slate-500 mt-2 bg-slate-50 rounded-lg p-3">
                  {instructions.instructions}
                </p>
              )}
            </div>
          ) : (
            <p className="text-slate-400 text-sm">Los datos de pago aún no están configurados. Contacta a soporte.</p>
          )}
        </div>
      </div>

      {/* Formulario de envío de comprobante */}
      {showForm && activePaymentId && (
        <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6 mb-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-1">Datos del Pago Realizado</h2>
          <p className="text-xs text-slate-500 mb-4">
            {(() => {
              const all = [...paymentsThisMonth, ...(data?.unpaidMonths ?? [])];
              const found = all.find(p => p.id === activePaymentId);
              return <>
                {found?.branchName && <><span className="font-medium text-blue-600">{found.branchName}</span> — </>}
                Período: <strong>{found?.period ?? ''}</strong>
              </>;
            })()}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Banco desde el que pagaste *</label>
              <select
                value={form.bankName}
                onChange={e => setForm(f => ({ ...f, bankName: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20"
              >
                <option value="">Selecciona el banco</option>
                {BANKS_RD.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Número de referencia *</label>
              <input
                type="text"
                value={form.referenceNumber}
                onChange={e => setForm(f => ({ ...f, referenceNumber: e.target.value }))}
                placeholder="Ej: TRF-2026030001"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Monto transferido *</label>
              <input
                type="number"
                value={form.transferAmount}
                onChange={e => setForm(f => ({ ...f, transferAmount: e.target.value }))}
                placeholder="0.00"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Foto del comprobante</label>
              {proofPreview ? (
                <div className="relative inline-block">
                  <img
                    src={proofPreview}
                    alt="Comprobante"
                    className="h-32 w-auto rounded-lg border border-slate-200 object-contain bg-slate-50"
                  />
                  <button
                    type="button"
                    onClick={removeProof}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <label className="flex items-center gap-2 cursor-pointer border-2 border-dashed border-slate-200 hover:border-red-400 rounded-lg px-4 py-3 text-sm text-slate-500 hover:text-red-600 transition-colors w-full">
                  <Image size={16} />
                  <span>Subir foto del recibo (JPG, PNG, PDF — máx 5MB)</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
              )}
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Notas adicionales</label>
              <textarea
                value={form.proofNotes}
                onChange={e => setForm(f => ({ ...f, proofNotes: e.target.value }))}
                rows={2}
                placeholder="Cualquier información adicional sobre el pago..."
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 bg-red-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {uploadingProof ? <><RefreshCw size={14} className="animate-spin" /> Subiendo imagen...</>
              : submitting ? <><RefreshCw size={14} className="animate-spin" /> Enviando...</>
              : <><Upload size={14} /> Enviar Comprobante</>}
            </button>
            <button
              onClick={() => { setShowForm(false); setActivePaymentId(null); removeProof(); }}
              className="px-5 py-2 rounded-lg text-sm font-medium border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Historial */}
      {history.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4 flex-wrap">
            <h2 className="text-sm font-semibold text-slate-700">Historial de Pagos</h2>
            {historyBranches.length > 1 && (
              <select
                value={selectedBranchId}
                onChange={e => setSelectedBranchId(e.target.value)}
                className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">Todas las sucursales</option>
                {historyBranches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                  <th className="px-5 py-3 text-left font-medium">Período</th>
                  {historyBranches.length > 1 && <th className="px-5 py-3 text-left font-medium">Sucursal</th>}
                  <th className="px-5 py-3 text-right font-medium">Monto</th>
                  <th className="px-5 py-3 text-left font-medium">Estado</th>
                  <th className="px-5 py-3 text-left font-medium">Fecha límite</th>
                  <th className="px-5 py-3 text-left font-medium">Referencia</th>
                  <th className="px-5 py-3 text-center font-medium">Comprobante</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredHistory.length === 0 && (
                  <tr><td colSpan={7} className="px-5 py-6 text-center text-slate-400 text-sm">No hay pagos para esta sucursal</td></tr>
                )}
                {filteredHistory.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-800">{p.period}</td>
                    {historyBranches.length > 1 && (
                      <td className="px-5 py-3 text-slate-500 text-xs">{p.branchName ?? <span className="text-slate-300">—</span>}</td>
                    )}
                    <td className="px-5 py-3 text-right font-semibold">
                      {fmtMoney(p.totalAmount)}
                      {p.lateFeeAmount > 0 && (
                        <span className="text-xs text-red-500 ml-1">(+{p.lateFeePercent}% mora)</span>
                      )}
                    </td>
                    <td className="px-5 py-3"><StatusBadge status={p.status} /></td>
                    <td className="px-5 py-3 text-slate-500">{fmt(p.dueDate)}</td>
                    <td className="px-5 py-3 text-slate-500 font-mono text-xs">{p.referenceNumber ?? '—'}</td>
                    <td className="px-5 py-3 text-center">
                      {(p as any).proofUrl ? (
                        <button onClick={() => setViewingProof((p as any).proofUrl)}
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 border border-blue-200 px-2 py-1 rounded-lg">
                          <Eye size={11} /> Ver
                        </button>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Ver comprobante */}
      {viewingProof && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setViewingProof(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-4 w-full max-w-2xl max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-800">Comprobante de Pago</h3>
              <div className="flex items-center gap-2">
                <a href={viewingProof} target="_blank" rel="noreferrer"
                  className="text-xs text-blue-600 hover:underline border border-blue-200 px-2 py-1 rounded">
                  Abrir original
                </a>
                <button onClick={() => setViewingProof(null)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">✕</button>
              </div>
            </div>
            {viewingProof.match(/\.pdf$/i) ? (
              <iframe src={viewingProof} className="w-full h-[70vh] rounded-lg border border-slate-100" />
            ) : (
              <img src={viewingProof} alt="Comprobante" className="w-full rounded-lg border border-slate-100 object-contain max-h-[70vh]" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
