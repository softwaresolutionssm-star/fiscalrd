'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import api from '@/lib/api';
import { toast } from 'sonner';
import { useBranch } from '@/contexts/branch-context';
import { useAuth } from '@/contexts/auth-context';
import {
  CalendarCheck, TrendingUp, TrendingDown, Lock, Eye,
  ChevronDown, ChevronUp, AlertTriangle, CheckCircle2,
  XCircle, Info, Building2,
} from 'lucide-react';

interface ClosingSummary {
  year: number;
  branchId: string | null;
  totalSales: number;
  totalPurchases: number;
  totalExpenses: number;
  totalPayroll: number;
  grossProfit: number;
  netResult: number;
  details: {
    saleCount: number;
    purchaseCount: number;
    expenseCount: number;
    payrollCount: number;
    itbisSales: number;
  };
}

interface Validation {
  canClose: boolean;
  alreadyClosed: boolean;
  blocks: string[];
  warnings: string[];
}

interface YearClosing {
  id: string;
  year: number;
  type: string;
  totalSales: number;
  totalPurchases: number;
  totalExpenses: number;
  totalPayroll: number;
  grossProfit: number;
  netResult: number;
  closedBy: string;
  notes: string | null;
  closedAt: string;
}

const fmt = (n: number) => `RD$${Number(n).toLocaleString('es-DO', { minimumFractionDigits: 2 })}`;
const fmtDate = (d: string) => new Date(d).toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' });

function MarginBadge({ sales, net }: { sales: number; net: number }) {
  if (sales === 0) return null;
  const pct = (net / sales) * 100;
  const color = pct >= 20 ? 'bg-emerald-100 text-emerald-700' : pct >= 5 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';
  const label = pct >= 20 ? 'Excelente' : pct >= 5 ? 'Aceptable' : pct < 0 ? 'Pérdida' : 'Bajo';
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>
      {label} {pct.toFixed(1)}% margen
    </span>
  );
}

function SummaryCard({ label, value, sub, color }: { label: string; value: number; sub?: string; color: string }) {
  return (
    <div className={`rounded-xl border p-4 ${color}`}>
      <p className="text-xs font-medium opacity-70 mb-1">{label}</p>
      <p className="text-xl font-bold">{fmt(value)}</p>
      {sub && <p className="text-xs opacity-60 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function YearClosingPage() {
  const { user } = useAuth();
  const { branches, isMultiBranch } = useBranch();

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear - 1);
  const [previewBranchId, setPreviewBranchId] = useState<string | null>(null); // solo para análisis
  const [isConsolidatedPreview, setIsConsolidatedPreview] = useState(true);

  const [preview, setPreview] = useState<ClosingSummary | null>(null);
  const [validation, setValidation] = useState<Validation | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [closings, setClosings] = useState<YearClosing[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const isOwner = user?.role === 'owner';
  const isSuperAdmin = user?.role === 'super_admin';
  const canClose = isOwner || isSuperAdmin;

  const load = async () => {
    try {
      const r = await api.get('/year-closing');
      setClosings(r.data?.data ?? r.data ?? []);
    } catch { /* ignore */ }
  };

  useEffect(() => { load(); }, []);

  // Comparación interanual
  const prevClosing = closings.find(c => c.year === selectedYear - 1);

  const loadPreview = async () => {
    setLoadingPreview(true);
    setValidation(null);
    try {
      const params: any = { year: selectedYear };
      if (!isConsolidatedPreview && previewBranchId) params.branchId = previewBranchId;

      const [previewRes, validateRes] = await Promise.all([
        api.get('/year-closing/preview', { params }),
        api.get('/year-closing/validate', { params: { year: selectedYear } }),
      ]);
      setPreview(previewRes.data?.data ?? previewRes.data);
      setValidation(validateRes.data?.data ?? validateRes.data);
    } catch {
      toast.error('Error calculando el resumen');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleClose = async () => {
    if (!preview || !validation?.canClose) return;
    setSubmitting(true);
    try {
      await api.post('/year-closing', { year: selectedYear, notes: notes || undefined });
      toast.success(`Cierre oficial ${selectedYear} registrado correctamente`);
      setShowForm(false);
      setPreview(null);
      setValidation(null);
      setNotes('');
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Error al cerrar el año');
    } finally {
      setSubmitting(false);
    }
  };

  const years = Array.from({ length: 6 }, (_, i) => currentYear - i - 1);
  const alreadyClosed = closings.some(c => c.year === selectedYear);

  return (
    <div>
      <PageHeader
        title="Cierre de Año"
        description="Resumen financiero anual consolidado del negocio"
        action={canClose ? (
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700"
          >
            <CalendarCheck size={16} /> Nuevo Cierre
          </button>
        ) : undefined}
      />

      {/* ── Aviso conceptual ───────────────────────────────────────────────── */}
      <div className="mb-6 flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700">
        <Info size={18} className="flex-shrink-0 mt-0.5" />
        <div>
          <strong>El cierre de año es siempre consolidado.</strong> Representa el ejercicio fiscal completo del negocio (todas las sucursales juntas).
          El contador ve los números globales. El análisis por sucursal está disponible en el preview informativo.
        </div>
      </div>

      {/* ── Formulario nuevo cierre ─────────────────────────────────────────── */}
      {showForm && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 mb-6">
          <h2 className="font-semibold text-slate-700 mb-4">Configurar Cierre de Año</h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Año a cerrar</label>
              <select
                value={selectedYear}
                onChange={e => { setSelectedYear(Number(e.target.value)); setPreview(null); setValidation(null); }}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            {/* Preview informativo — puede ser por sucursal solo para análisis */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Vista del preview</label>
              <select
                value={isConsolidatedPreview ? 'consolidated' : 'branch'}
                onChange={e => { setIsConsolidatedPreview(e.target.value === 'consolidated'); setPreview(null); }}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="consolidated">Consolidado (todo el negocio)</option>
                {isMultiBranch && <option value="branch">Por sucursal (solo análisis)</option>}
              </select>
            </div>

            {!isConsolidatedPreview && isMultiBranch && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Sucursal a analizar</label>
                <select
                  value={previewBranchId ?? ''}
                  onChange={e => { setPreviewBranchId(e.target.value || null); setPreview(null); }}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">— Seleccionar —</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            )}
          </div>

          {alreadyClosed && (
            <div className="mb-4 flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-lg p-3 text-sm text-amber-700">
              <AlertTriangle size={15} />
              Ya existe un cierre oficial para el año {selectedYear}.
            </div>
          )}

          <button
            onClick={loadPreview}
            disabled={loadingPreview || (!isConsolidatedPreview && !previewBranchId)}
            className="flex items-center gap-2 bg-slate-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-slate-800 disabled:opacity-50"
          >
            <Eye size={14} /> {loadingPreview ? 'Calculando...' : 'Calcular preview'}
          </button>

          {/* ── Validaciones pre-cierre ─────────────────────────────────── */}
          {validation && (
            <div className="mt-4 space-y-2">
              {validation.blocks.map((b, i) => (
                <div key={i} className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-lg p-3 text-sm text-red-700">
                  <XCircle size={15} /> {b}
                </div>
              ))}
              {validation.warnings.map((w, i) => (
                <div key={i} className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-lg p-3 text-sm text-amber-700">
                  <AlertTriangle size={15} /> {w}
                </div>
              ))}
              {validation.canClose && validation.warnings.length === 0 && (
                <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-lg p-3 text-sm text-green-700">
                  <CheckCircle2 size={15} /> Todo en orden para cerrar el año
                </div>
              )}
            </div>
          )}

          {/* ── Preview de cifras ───────────────────────────────────────── */}
          {preview && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Building2 size={15} className="text-slate-400" />
                  {isConsolidatedPreview
                    ? `Resumen ${preview.year} — Consolidado (todo el negocio)`
                    : `Análisis ${preview.year} — ${branches.find(b => b.id === previewBranchId)?.name ?? 'Sucursal'}`}
                </div>
                <MarginBadge sales={preview.totalSales} net={preview.netResult} />
              </div>

              {/* Nota cuando es vista por sucursal */}
              {!isConsolidatedPreview && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-700">
                  <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>Preview informativo por sucursal.</strong> El cierre oficial registra el negocio completo.
                    No puedes registrar un cierre parcial por sucursal — usa esto solo para análisis interno.
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <SummaryCard label="Total Ventas" value={preview.totalSales}
                  sub={`${preview.details.saleCount} comprobantes`}
                  color="bg-green-50 border-green-100 text-green-900" />
                <SummaryCard label="Total Compras" value={preview.totalPurchases}
                  sub={`${preview.details.purchaseCount} compras`}
                  color="bg-blue-50 border-blue-100 text-blue-900" />
                <SummaryCard label="Total Gastos" value={preview.totalExpenses}
                  sub={`${preview.details.expenseCount} registros`}
                  color="bg-orange-50 border-orange-100 text-orange-900" />
                <SummaryCard label="Nómina Pagada" value={preview.totalPayroll}
                  sub={`${preview.details.payrollCount} nóminas`}
                  color="bg-purple-50 border-purple-100 text-purple-900" />
                <SummaryCard label="Utilidad Bruta" value={preview.grossProfit}
                  color={preview.grossProfit >= 0 ? "bg-emerald-50 border-emerald-100 text-emerald-900" : "bg-red-50 border-red-100 text-red-900"} />
                <SummaryCard label="Resultado Neto" value={preview.netResult}
                  color={preview.netResult >= 0 ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-red-50 border-red-200 text-red-900"} />
              </div>

              {/* Comparación interanual */}
              {prevClosing && isConsolidatedPreview && (
                <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-600">
                  <p className="font-medium text-slate-700 mb-2">Comparación con {prevClosing.year}</p>
                  {(() => {
                    const diff = preview.netResult - Number(prevClosing.netResult);
                    const pct = Number(prevClosing.netResult) !== 0 ? (diff / Math.abs(Number(prevClosing.netResult))) * 100 : null;
                    return (
                      <div className={`flex items-center gap-2 font-semibold ${diff >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {diff >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                        {diff >= 0 ? 'Mejor' : 'Peor'} que {prevClosing.year} en {fmt(Math.abs(diff))}
                        {pct !== null && ` (${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%)`}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Botón cierre — solo si consolidado + puede cerrar */}
              {isConsolidatedPreview && canClose && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Notas del cierre (opcional)</label>
                    <textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      rows={2}
                      placeholder="Observaciones del ejercicio fiscal..."
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleClose}
                      disabled={submitting || !validation?.canClose || alreadyClosed}
                      className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
                      title={!validation?.canClose ? validation?.blocks[0] : alreadyClosed ? 'Ya cerrado' : ''}
                    >
                      <Lock size={14} /> {submitting ? 'Guardando...' : `Registrar Cierre Oficial ${selectedYear}`}
                    </button>
                    <button
                      onClick={() => { setShowForm(false); setPreview(null); setValidation(null); }}
                      className="px-5 py-2 rounded-lg text-sm border border-slate-200 hover:bg-slate-50"
                    >
                      Cancelar
                    </button>
                  </div>
                </>
              )}

              {/* Si está en vista por sucursal, explicar por qué no puede cerrar */}
              {!isConsolidatedPreview && (
                <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-50 rounded-lg p-3">
                  <Info size={13} />
                  Para registrar el cierre oficial, cambia la vista a "Consolidado (todo el negocio)".
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Historial de cierres ─────────────────────────────────────────── */}
      {closings.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-12 text-center text-slate-400">
          <CalendarCheck size={40} className="mx-auto mb-3 text-slate-200" />
          <p className="font-medium text-slate-500">No hay cierres registrados</p>
          <p className="text-sm mt-1">Cuando registres un cierre aparecerá aquí.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700">Historial de Cierres</h2>
          </div>
          <div className="divide-y divide-slate-50">
            {closings.map((c, idx) => {
              const next = closings[idx + 1]; // año anterior en el array ordenado DESC
              const diff = next ? Number(c.netResult) - Number(next.netResult) : null;
              const pct = (diff !== null && Number(next?.netResult) !== 0)
                ? (diff / Math.abs(Number(next.netResult))) * 100
                : null;

              return (
                <div key={c.id} className="px-6 py-4">
                  <button
                    className="w-full flex items-center justify-between text-left"
                    onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-700 font-bold text-sm">
                        {c.year}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800 flex items-center gap-2">
                          Año {c.year}
                          <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Consolidado</span>
                          <MarginBadge sales={Number(c.totalSales)} net={Number(c.netResult)} />
                        </p>
                        <p className="text-xs text-slate-400">
                          Cerrado por {c.closedBy} — {fmtDate(c.closedAt)}
                          {pct !== null && (
                            <span className={`ml-2 ${diff! >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                              {diff! >= 0 ? '▲' : '▼'} {Math.abs(pct).toFixed(1)}% vs {next!.year}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs text-slate-400">Resultado neto</p>
                        <p className={`font-bold text-sm ${Number(c.netResult) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {fmt(Number(c.netResult))}
                        </p>
                      </div>
                      {expanded === c.id ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                    </div>
                  </button>

                  {expanded === c.id && (
                    <div className="mt-4 space-y-3">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <SummaryCard label="Ventas" value={Number(c.totalSales)} color="bg-green-50 border-green-100 text-green-900" />
                        <SummaryCard label="Compras" value={Number(c.totalPurchases)} color="bg-blue-50 border-blue-100 text-blue-900" />
                        <SummaryCard label="Gastos" value={Number(c.totalExpenses)} color="bg-orange-50 border-orange-100 text-orange-900" />
                        <SummaryCard label="Nómina" value={Number(c.totalPayroll)} color="bg-purple-50 border-purple-100 text-purple-900" />
                        <SummaryCard label="Utilidad Bruta" value={Number(c.grossProfit)} color="bg-emerald-50 border-emerald-100 text-emerald-900" />
                        <SummaryCard label="Resultado Neto" value={Number(c.netResult)} color={Number(c.netResult) >= 0 ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-red-50 border-red-200 text-red-900"} />
                      </div>
                      {c.notes && (
                        <div className="text-xs text-slate-500 bg-slate-50 rounded-lg p-3">{c.notes}</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
