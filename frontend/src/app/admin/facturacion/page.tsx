'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { PageHeader } from '@/components/ui/page-header';
import {
  CheckCircle, Clock, AlertCircle, XCircle, RefreshCw, Lock, Unlock,
  DollarSign, Plus, Eye, EyeOff, Play, History,
} from 'lucide-react';
import { useConfirm } from '@/components/ui/confirm-dialog';

interface OverviewItem {
  tenantId: string; businessName: string; email: string; plan: string;
  isBillingBlocked: boolean; billingNotes: string | null; monthlyPrice: number;
  currentPeriod: Payment | null;
}

interface Payment {
  id: string; tenantId: string; period: string; businessName?: string;
  plan?: string; email?: string; isBillingBlocked?: boolean;
  branchId: string | null; branchName: string | null;
  baseAmount: number; lateFeePercent: number; lateFeeAmount: number; totalAmount: number;
  dueDate: string; status: string; submittedAt: string | null;
  bankName: string | null; referenceNumber: string | null; transferAmount: number | null;
  proofNotes: string | null; proofUrl: string | null;
  approvedAt: string | null; approvedBy: string | null;
  rejectedAt: string | null; rejectedReason: string | null; adminNotes: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pending:   { label: 'Pendiente',   color: 'bg-amber-100 text-amber-700',  icon: Clock },
  submitted: { label: 'Por revisar', color: 'bg-blue-100 text-blue-700',    icon: RefreshCw },
  approved:  { label: 'Aprobado',    color: 'bg-green-100 text-green-700',  icon: CheckCircle },
  rejected:  { label: 'Rechazado',   color: 'bg-red-100 text-red-700',      icon: XCircle },
  overdue:   { label: 'Vencido',     color: 'bg-red-200 text-red-900',      icon: AlertCircle },
  waived:    { label: 'Condonado',   color: 'bg-purple-100 text-purple-700',icon: CheckCircle },
};

const PLAN_LABELS: Record<string, string> = {
  free: 'Gratis', basic: 'Básico', pro: 'Pro', enterprise: 'Empresarial',
};

function fmt(d: string | null) {
  if (!d) return '—';
  const date = d.includes('T') ? new Date(d) : new Date(d + 'T12:00:00');
  return date.toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtMoney(n: number) {
  return `RD$${Number(n).toLocaleString('es-DO', { minimumFractionDigits: 0 })}`;
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: 'bg-slate-100 text-slate-600', icon: Clock };
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
      <Icon size={11} /> {cfg.label}
    </span>
  );
}

export default function AdminBillingPage() {
  const confirm = useConfirm();
  const [overview, setOverview] = useState<OverviewItem[]>([]);
  const [pendingPayments, setPendingPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'pending' | 'history'>('pending');
  const [allPayments, setAllPayments] = useState<Payment[]>([]);

  // Modales
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState<string | null>(null); // tenantId
  const [manualForm, setManualForm] = useState({ period: '', amount: '', paymentMethod: 'Transferencia', referenceNumber: '', notes: '' });
  const [showProof, setShowProof] = useState<Payment | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [overviewRes, pendingRes, allRes] = await Promise.all([
        api.get('/billing/admin/overview'),
        api.get('/billing/admin/payments?status=submitted'),
        api.get('/billing/admin/payments'),
      ]);
      setOverview(overviewRes.data.data ?? overviewRes.data);
      setPendingPayments(pendingRes.data.data ?? pendingRes.data);
      setAllPayments(allRes.data.data ?? allRes.data);
    } catch {
      toast.error('Error cargando datos de facturación');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const approve = async (paymentId: string) => {
    try {
      await api.patch(`/billing/admin/payments/${paymentId}/approve`);
      toast.success('Pago aprobado');
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Error al aprobar');
    }
  };

  const reject = async () => {
    if (!selectedPayment) return;
    if (!rejectReason.trim()) { toast.error('Escribe una razón'); return; }
    try {
      await api.patch(`/billing/admin/payments/${selectedPayment.id}/reject`, { reason: rejectReason });
      toast.success('Pago rechazado');
      setShowRejectModal(false);
      setRejectReason('');
      setSelectedPayment(null);
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Error al rechazar');
    }
  };

  const waive = async (paymentId: string) => {
    if (!await confirm({ title: 'Condonar pago', message: '¿Condonar este pago? El negocio no tendrá que pagarlo.', confirmText: 'Condonar', variant: 'warning' })) return;
    try {
      await api.patch(`/billing/admin/payments/${paymentId}/waive`);
      toast.success('Pago condonado');
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Error');
    }
  };

  const toggleBlock = async (tenantId: string, blocked: boolean, name: string) => {
    const msg = blocked ? `¿Bloquear el acceso de ${name}?` : `¿Desbloquear el acceso de ${name}?`;
    if (!await confirm({ title: blocked ? 'Bloquear negocio' : 'Desbloquear negocio', message: msg, confirmText: blocked ? 'Bloquear' : 'Desbloquear', variant: 'warning' })) return;
    try {
      await api.patch(`/billing/admin/tenants/${tenantId}/block`, { blocked });
      toast.success(blocked ? 'Negocio bloqueado' : 'Negocio desbloqueado');
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Error');
    }
  };

  const registerManual = async () => {
    if (!showManualModal) return;
    if (!manualForm.period || !manualForm.amount) { toast.error('Período y monto son requeridos'); return; }
    try {
      await api.post(`/billing/admin/tenants/${showManualModal}/manual-payment`, {
        period: manualForm.period,
        amount: parseFloat(manualForm.amount),
        paymentMethod: manualForm.paymentMethod,
        referenceNumber: manualForm.referenceNumber || undefined,
        notes: manualForm.notes || undefined,
      });
      toast.success('Pago registrado manualmente');
      setShowManualModal(null);
      setManualForm({ period: '', amount: '', paymentMethod: 'Transferencia', referenceNumber: '', notes: '' });
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Error');
    }
  };

  const triggerCheck = async () => {
    try {
      await api.post('/billing/admin/check');
      toast.success('Verificación ejecutada. Recargando...');
      load();
    } catch (e: any) {
      toast.error('Error ejecutando verificación');
    }
  };

  // Stats
  const totalMRR = overview.filter(t => t.currentPeriod?.status === 'approved').reduce((s, t) => s + t.monthlyPrice, 0);
  const pendingCount = pendingPayments.length;
  const blockedCount = overview.filter(t => t.isBillingBlocked).length;
  const overdueCount = overview.filter(t => t.currentPeriod?.status === 'overdue').length;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Facturación"
        description="Control de pagos de suscripciones"
        action={
          <button onClick={triggerCheck}
            className="flex items-center gap-2 border border-slate-200 bg-white px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors">
            <Play size={13} /> Verificar ahora
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'MRR Cobrado', value: fmtMoney(totalMRR), icon: DollarSign, color: 'text-green-600 bg-green-50' },
          { label: 'Por Aprobar', value: pendingCount, icon: Clock, color: 'text-blue-600 bg-blue-50' },
          { label: 'Vencidos', value: overdueCount, icon: AlertCircle, color: 'text-amber-600 bg-amber-50' },
          { label: 'Bloqueados', value: blockedCount, icon: Lock, color: 'text-red-600 bg-red-50' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex items-center gap-3">
            <div className={`p-2 rounded-lg ${s.color.split(' ')[1]}`}>
              <s.icon size={18} className={s.color.split(' ')[0]} />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-800">{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-slate-100 p-1 rounded-xl w-fit">
        {(['pending', 'overview', 'history'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}>
            {tab === 'pending' ? `Por Revisar ${pendingCount > 0 ? `(${pendingCount})` : ''}` : tab === 'overview' ? 'Todos los Negocios' : 'Historial'}
          </button>
        ))}
      </div>

      {/* Tab: Pagos por revisar */}
      {activeTab === 'pending' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100">
          {pendingPayments.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <CheckCircle size={36} className="mx-auto mb-2 text-green-300" />
              <p className="font-medium">No hay pagos pendientes de revisión</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {pendingPayments.map(p => (
                <div key={p.id} className="p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-slate-800">{p.businessName}</p>
                        <StatusBadge status={p.status} />
                        {p.isBillingBlocked && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700">
                            <Lock size={10} /> Bloqueado
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">
                        {p.email} · Plan {PLAN_LABELS[p.plan ?? ''] ?? p.plan} · Período {p.period}
                        {p.branchName && <> · Sucursal <strong>{p.branchName}</strong></>}
                      </p>

                      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div className="bg-slate-50 rounded-lg p-2">
                          <p className="text-slate-400">Monto</p>
                          <p className="font-bold text-slate-800">{fmtMoney(p.totalAmount)}</p>
                          {p.lateFeeAmount > 0 && <p className="text-red-500">+{fmtMoney(p.lateFeeAmount)} mora</p>}
                        </div>
                        <div className="bg-slate-50 rounded-lg p-2">
                          <p className="text-slate-400">Banco</p>
                          <p className="font-medium text-slate-700">{p.bankName ?? '—'}</p>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-2">
                          <p className="text-slate-400">Referencia</p>
                          <p className="font-mono text-slate-700">{p.referenceNumber ?? '—'}</p>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-2">
                          <p className="text-slate-400">Transferido</p>
                          <p className="font-bold text-slate-800">{p.transferAmount ? fmtMoney(p.transferAmount) : '—'}</p>
                        </div>
                      </div>

                      {p.proofNotes && (
                        <p className="mt-2 text-xs text-slate-500 bg-slate-50 rounded p-2">{p.proofNotes}</p>
                      )}

                      {p.proofUrl && (
                        <button
                          onClick={() => setShowProof(p)}
                          className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 border border-blue-200 hover:border-blue-400 px-2 py-1 rounded-lg transition-colors"
                        >
                          <Eye size={12} /> Ver comprobante
                        </button>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <button onClick={() => approve(p.id)}
                        className="flex items-center gap-1.5 bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-green-700 transition-colors">
                        <CheckCircle size={13} /> Aprobar
                      </button>
                      <button onClick={() => { setSelectedPayment(p); setShowRejectModal(true); }}
                        className="flex items-center gap-1.5 bg-red-50 text-red-700 border border-red-200 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors">
                        <XCircle size={13} /> Rechazar
                      </button>
                      <button onClick={() => waive(p.id)}
                        className="flex items-center gap-1.5 bg-purple-50 text-purple-700 border border-purple-200 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-purple-100 transition-colors">
                        <EyeOff size={13} /> Condonar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Overview de todos los negocios */}
      {activeTab === 'overview' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                  <th className="px-5 py-3 text-left font-medium">Negocio</th>
                  <th className="px-5 py-3 text-left font-medium">Plan</th>
                  <th className="px-5 py-3 text-right font-medium">Mensualidad</th>
                  <th className="px-5 py-3 text-left font-medium">Estado actual</th>
                  <th className="px-5 py-3 text-left font-medium">Vencimiento</th>
                  <th className="px-5 py-3 text-center font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {overview.map(t => (
                  <tr key={t.tenantId} className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        {t.isBillingBlocked && <Lock size={13} className="text-red-500 flex-shrink-0" />}
                        <div>
                          <p className="font-medium text-slate-800">{t.businessName}</p>
                          <p className="text-xs text-slate-400">{t.email}</p>
                          {t.billingNotes && <p className="text-xs text-amber-600 mt-0.5">{t.billingNotes}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{PLAN_LABELS[t.plan] ?? t.plan}</td>
                    <td className="px-5 py-3 text-right font-semibold text-slate-700">
                      {t.monthlyPrice > 0 ? fmtMoney(t.monthlyPrice) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-5 py-3">
                      {t.monthlyPrice === 0
                        ? <span className="text-xs text-slate-400">Plan gratuito</span>
                        : t.currentPeriod
                          ? <StatusBadge status={t.currentPeriod.status} />
                          : <span className="text-xs text-slate-400">Sin registro</span>}
                    </td>
                    <td className="px-5 py-3 text-slate-500 text-xs">
                      {t.currentPeriod ? fmt(t.currentPeriod.dueDate) : '—'}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-center gap-1.5">
                        {t.currentPeriod?.proofUrl && (
                          <button
                            onClick={() => setShowProof(t.currentPeriod!)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Ver comprobante">
                            <Eye size={14} />
                          </button>
                        )}
                        {t.monthlyPrice > 0 && (
                          <button
                            onClick={() => { setShowManualModal(t.tenantId); setManualForm(f => ({ ...f, amount: String(t.monthlyPrice) })); }}
                            className="p-1.5 text-slate-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Registrar pago manual">
                            <Plus size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => toggleBlock(t.tenantId, !t.isBillingBlocked, t.businessName)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            t.isBillingBlocked
                              ? 'text-red-500 hover:text-green-600 hover:bg-green-50'
                              : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                          }`}
                          title={t.isBillingBlocked ? 'Desbloquear' : 'Bloquear'}>
                          {t.isBillingBlocked ? <Unlock size={14} /> : <Lock size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Historial de todos los pagos */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                  <th className="px-5 py-3 text-left font-medium">Negocio</th>
                  <th className="px-5 py-3 text-left font-medium">Sucursal</th>
                  <th className="px-5 py-3 text-left font-medium">Período</th>
                  <th className="px-5 py-3 text-right font-medium">Monto</th>
                  <th className="px-5 py-3 text-left font-medium">Estado</th>
                  <th className="px-5 py-3 text-left font-medium">Referencia</th>
                  <th className="px-5 py-3 text-center font-medium">Comprobante</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {allPayments.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-10 text-slate-400">Sin pagos registrados</td></tr>
                ) : allPayments.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <p className="font-medium text-slate-800">{p.businessName}</p>
                      <p className="text-xs text-slate-400">{p.email}</p>
                    </td>
                    <td className="px-5 py-3 text-slate-600 text-xs">{p.branchName ?? <span className="text-slate-300">—</span>}</td>
                    <td className="px-5 py-3 text-slate-700">{p.period}</td>
                    <td className="px-5 py-3 text-right font-semibold">
                      {fmtMoney(p.totalAmount)}
                      {p.lateFeeAmount > 0 && <span className="text-xs text-red-500 ml-1">(mora)</span>}
                    </td>
                    <td className="px-5 py-3"><StatusBadge status={p.status} /></td>
                    <td className="px-5 py-3 text-slate-500 font-mono text-xs">{p.referenceNumber ?? '—'}</td>
                    <td className="px-5 py-3 text-center">
                      {p.proofUrl ? (
                        <button onClick={() => setShowProof(p)}
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

      {/* Modal: Rechazar pago */}
      {showRejectModal && selectedPayment && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <h3 className="font-semibold text-slate-800 mb-3">Rechazar Pago — {selectedPayment.businessName}</h3>
            <p className="text-sm text-slate-500 mb-4">El negocio recibirá un email con la razón del rechazo.</p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              rows={3}
              placeholder="Razón del rechazo (ej: Monto incorrecto, referencia inválida...)"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 mb-4"
            />
            <div className="flex gap-2">
              <button onClick={reject}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700">
                Rechazar
              </button>
              <button onClick={() => { setShowRejectModal(false); setRejectReason(''); }}
                className="flex-1 border border-slate-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Ver comprobante */}
      {showProof && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowProof(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-4 w-full max-w-2xl max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold text-slate-800">Comprobante de Pago</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {showProof.businessName}{showProof.branchName ? ` · ${showProof.branchName}` : ''} — Período {showProof.period}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={showProof.proofUrl!}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-600 hover:underline border border-blue-200 px-2 py-1 rounded"
                >
                  Abrir original
                </a>
                <button onClick={() => setShowProof(null)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">✕</button>
              </div>
            </div>
            {showProof.proofUrl?.match(/\.(jpg|jpeg|png|gif|webp)$/i) || showProof.proofUrl?.includes('/uploads/') ? (
              <img
                src={showProof.proofUrl}
                alt="Comprobante de pago"
                className="w-full rounded-lg border border-slate-100 object-contain max-h-[70vh]"
              />
            ) : showProof.proofUrl?.match(/\.pdf$/i) ? (
              <iframe src={showProof.proofUrl} className="w-full h-[70vh] rounded-lg border border-slate-100" />
            ) : (
              <div className="text-center py-8 text-slate-400">
                <a href={showProof.proofUrl!} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                  Ver archivo adjunto
                </a>
              </div>
            )}
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500">
              <div><span className="font-medium">Banco:</span> {showProof.bankName ?? '—'}</div>
              <div><span className="font-medium">Referencia:</span> {showProof.referenceNumber ?? '—'}</div>
              <div><span className="font-medium">Monto transferido:</span> {showProof.transferAmount ? fmtMoney(showProof.transferAmount) : '—'}</div>
              <div><span className="font-medium">Enviado:</span> {fmt(showProof.submittedAt)}</div>
              {showProof.proofNotes && <div className="col-span-2"><span className="font-medium">Notas:</span> {showProof.proofNotes}</div>}
            </div>
            <div className="flex gap-2 mt-4">
              {showProof.status === 'submitted' && (
                <>
                  <button
                    onClick={() => { approve(showProof.id); setShowProof(null); }}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700"
                  >
                    <CheckCircle size={14} /> Aprobar Pago
                  </button>
                  <button
                    onClick={() => { setSelectedPayment(showProof); setShowRejectModal(true); setShowProof(null); }}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-red-50 text-red-700 border border-red-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100"
                  >
                    <XCircle size={14} /> Rechazar
                  </button>
                </>
              )}
              {['approved', 'waived', 'rejected'].includes(showProof.status) && (
                <button
                  onClick={async () => {
                    if (!await confirm({ title: 'Revertir pago', message: '¿Revertir este pago a pendiente? El negocio tendrá que volver a enviarlo.', confirmText: 'Revertir', variant: 'warning' })) return;
                    try {
                      await (await import('@/lib/api')).default.patch(`/billing/admin/payments/${showProof.id}/revert`);
                      setShowProof(null);
                      load();
                    } catch { }
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-100"
                >
                  <RefreshCw size={14} /> Revertir a pendiente
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Pago manual */}
      {showManualModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <h3 className="font-semibold text-slate-800 mb-4">Registrar Pago Manual</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-600">Período (YYYY-MM) *</label>
                <input type="text" value={manualForm.period}
                  onChange={e => setManualForm(f => ({ ...f, period: e.target.value }))}
                  placeholder="2026-03"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-red-500/20" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Monto recibido *</label>
                <input type="number" value={manualForm.amount}
                  onChange={e => setManualForm(f => ({ ...f, amount: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-red-500/20" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Método de pago</label>
                <select value={manualForm.paymentMethod}
                  onChange={e => setManualForm(f => ({ ...f, paymentMethod: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-red-500/20">
                  <option>Transferencia</option><option>Efectivo</option><option>Tarjeta</option>
                  <option>WhatsApp Pay</option><option>Otro</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Referencia / Comprobante</label>
                <input type="text" value={manualForm.referenceNumber}
                  onChange={e => setManualForm(f => ({ ...f, referenceNumber: e.target.value }))}
                  placeholder="Número de referencia"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-red-500/20" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Notas internas</label>
                <textarea value={manualForm.notes} rows={2}
                  onChange={e => setManualForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-red-500/20" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={registerManual}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700">
                Registrar Pago
              </button>
              <button onClick={() => setShowManualModal(null)}
                className="flex-1 border border-slate-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
