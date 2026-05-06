'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import api from '@/lib/api';
import { toast } from 'sonner';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { Download, FileDown, CheckCircle, Trash2, History } from 'lucide-react';

type TabKey = '607' | '606' | '608' | '623' | 'IT1' | 'HISTORIAL';

// ─── CSV helpers ──────────────────────────────────────────────────────────────
function toCsv(headers: string[], rows: string[][]): string {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  return [headers, ...rows].map(r => r.map(esc).join(',')).join('\r\n');
}
function downloadCsv(content: string, filename: string) {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function DgiiReportsPage() {
  const now = new Date();
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [activeTab, setActiveTab] = useState<TabKey>('607');
  const [report607, setReport607] = useState<any>(null);
  const [report606, setReport606] = useState<any>(null);
  const [report608, setReport608] = useState<any>(null);
  const [report623, setReport623] = useState<any>(null);
  const [reportIT1, setReportIT1] = useState<any>(null);
  const [reportIT1Annual, setReportIT1Annual] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [rnc, setRnc] = useState('');
  const [rncResult, setRncResult] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);

  const loadSubmissions = () =>
    api.get(`/dgii-reports/submissions?year=${year}`)
      .then(r => setSubmissions(r.data.data ?? r.data ?? []))
      .catch(() => {});

  const markSubmitted = async (reportType: string) => {
    const period = `${year}-${String(month).padStart(2, '0')}`;
    try {
      await api.post('/dgii-reports/submissions', { reportType, period });
      toast.success(`Reporte ${reportType} marcado como enviado al DGII`);
      loadSubmissions();
    } catch {
      toast.error('Error al registrar envío');
    }
  };

  const deleteSubmission = async (id: string) => {
    try {
      await api.delete(`/dgii-reports/submissions/${id}`);
      loadSubmissions();
    } catch {
      toast.error('Error al eliminar registro');
    }
  };

  const isSubmitted = (reportType: string) => {
    const period = `${year}-${String(month).padStart(2, '0')}`;
    return submissions.some(s => s.reportType === reportType && s.period === period);
  };

  useEffect(() => { loadSubmissions(); }, [year]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadReports = async () => {
    setLoading(true);
    try {
      const [r607, r606, r608, r623, rIT1] = await Promise.all([
        api.get(`/dgii-reports/607?year=${year}&month=${month}`),
        api.get(`/dgii-reports/606?year=${year}&month=${month}`),
        api.get(`/dgii-reports/608?year=${year}&month=${month}`),
        api.get(`/dgii-reports/623?year=${year}&month=${month}`),
        api.get(`/dgii-reports/it1?year=${year}&month=${month}`),
      ]);
      setReport607(r607.data.data ?? r607.data);
      setReport606(r606.data.data ?? r606.data);
      setReport608(r608.data.data ?? r608.data);
      setReport623(r623.data.data ?? r623.data);
      setReportIT1(rIT1.data.data ?? rIT1.data);
    } catch {
      toast.error('Error al cargar reportes');
    } finally {
      setLoading(false);
    }
  };

  const exportCsv607 = () => {
    if (!report607?.lines) return;
    const headers = ['#','RNC/Cédula','Cliente','NCF','Tipo NCF','Fecha','Subtotal','ITBIS','Total','Pago'];
    const rows = report607.lines.map((l: any, i: number) => [
      String(i+1), l.customerRnc||l.rnc||'', l.customerName||'Consumidor Final',
      l.ncfNumber||'', l.ncfType||'', l.ncfDate||l.date||'',
      Number(l.subtotal).toFixed(2), Number(l.itbis).toFixed(2), Number(l.total).toFixed(2), l.paymentMethod||'',
    ]);
    downloadCsv(toCsv(headers, rows), `607_${year}-${String(month).padStart(2,'0')}.csv`);
  };

  const exportCsv606 = () => {
    if (!report606?.lines) return;
    const headers = ['#','RNC Proveedor','NCF','Tipo NCF','Fecha','Subtotal','ITBIS','Total'];
    const rows = report606.lines.map((l: any, i: number) => [
      String(i+1), l.rnc||'', l.ncfNumber||'', l.ncfType||'', l.ncfDate||l.date||'',
      Number(l.subtotal).toFixed(2), Number(l.itbis).toFixed(2), Number(l.total).toFixed(2),
    ]);
    downloadCsv(toCsv(headers, rows), `606_${year}-${String(month).padStart(2,'0')}.csv`);
  };

  const downloadTxt = async (reportType: '606' | '607' | '608' | '623') => {
    try {
      const res = await api.get(
        `/dgii-reports/${reportType}/download?year=${year}&month=${month}`,
        { responseType: 'blob' }
      );
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportType}_${year}-${String(month).padStart(2, '0')}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(`Error al descargar reporte ${reportType}`);
    }
  };

  const validateRnc = async () => {
    if (!rnc) return;
    try {
      const r = await api.get(`/dgii-reports/validate-rnc/${rnc}`);
      setRncResult(r.data.data);
    } catch {
      toast.error('Error al validar RNC');
    }
  };

  const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  const tabs: { key: TabKey; label: string }[] = [
    { key: '607', label: '607 — Ventas' },
    { key: '606', label: '606 — Compras' },
    { key: '608', label: '608 — Anulados' },
    { key: '623', label: '623 — Retenciones' },
    { key: 'IT1', label: 'IT-1' },
    { key: 'HISTORIAL', label: 'Historial de Envíos' },
  ];

  return (
    <div>
      <PageHeader title="Reportes DGII" description="Generación de reportes fiscales obligatorios" />

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 mb-6">
        <div className="flex gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Año</label>
            <input type="number" className="w-28 border rounded-lg px-3 py-2 text-sm" value={year} onChange={e => setYear(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Mes</label>
            <select className="w-36 border rounded-lg px-3 py-2 text-sm" value={month} onChange={e => setMonth(e.target.value)}>
              {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <button onClick={loadReports} disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Cargando...' : 'Generar Reportes'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-6 gap-1">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === t.key
                ? 'bg-white border border-b-white border-slate-200 text-blue-600 -mb-px'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === '607' && (
        <div className="space-y-6">
          {report607 ? (
            <>
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="font-semibold text-slate-700">Reporte 607 — Ventas</h2>
                    <p className="text-xs text-slate-400">Período: {report607.period}</p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={exportCsv607} className="flex items-center gap-2 border border-green-200 bg-green-50 text-green-700 px-3 py-1.5 rounded-lg text-sm hover:bg-green-100">
                      <FileDown size={14} /> CSV
                    </button>
                    <button onClick={() => downloadTxt('607')} className="flex items-center gap-2 border border-slate-200 text-slate-500 px-3 py-1.5 rounded-lg text-sm hover:bg-slate-50">
                      <Download size={14} /> .txt DGII
                    </button>
                    {isSubmitted('607')
                      ? <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg"><CheckCircle size={13} /> Enviado al DGII</span>
                      : <button onClick={() => markSubmitted('607')} className="flex items-center gap-2 border border-blue-200 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-sm hover:bg-blue-100"><CheckCircle size={14} /> Marcar enviado</button>
                    }
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">Registros:</span><span className="font-medium">{report607.totalRecords}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Subtotal:</span><span className="font-medium">{formatCurrency(report607.totals?.subtotal ?? 0)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">ITBIS:</span><span className="font-medium">{formatCurrency(report607.totals?.itbis ?? 0)}</span></div>
                  <div className="flex justify-between border-t pt-2"><span className="font-semibold">Total:</span><span className="font-bold">{formatCurrency(report607.totals?.total ?? 0)}</span></div>
                </div>
              </div>

              {report607?.lines?.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100">
                    <h2 className="font-semibold text-slate-700">Detalle 607</h2>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50"><tr>
                      <th className="text-left px-4 py-3 text-slate-600 font-medium">RNC/Cédula</th>
                      <th className="text-left px-4 py-3 text-slate-600 font-medium">NCF</th>
                      <th className="text-left px-4 py-3 text-slate-600 font-medium">Fecha</th>
                      <th className="text-right px-4 py-3 text-slate-600 font-medium">Subtotal</th>
                      <th className="text-right px-4 py-3 text-slate-600 font-medium">ITBIS</th>
                      <th className="text-right px-4 py-3 text-slate-600 font-medium">Total</th>
                    </tr></thead>
                    <tbody>
                      {report607.lines.map((l: any, i: number) => (
                        <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                          <td className="px-4 py-2 text-slate-500">{l.rnc || 'Consumidor Final'}</td>
                          <td className="px-4 py-2 font-mono text-slate-700">{l.ncfNumber}</td>
                          <td className="px-4 py-2 text-slate-500">{l.ncfDate}</td>
                          <td className="px-4 py-2 text-right">{formatCurrency(l.subtotal)}</td>
                          <td className="px-4 py-2 text-right">{formatCurrency(l.itbis)}</td>
                          <td className="px-4 py-2 text-right font-medium">{formatCurrency(l.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-12 text-center text-slate-400 text-sm">
              Presiona "Generar Reportes" para cargar el reporte 607.
            </div>
          )}
        </div>
      )}

      {activeTab === '606' && (
        <div className="space-y-6">
          {report606 ? (
            <>
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="font-semibold text-slate-700">Reporte 606 — Compras</h2>
                    <p className="text-xs text-slate-400">Período: {report606.period}</p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={exportCsv606} className="flex items-center gap-2 border border-green-200 bg-green-50 text-green-700 px-3 py-1.5 rounded-lg text-sm hover:bg-green-100">
                      <FileDown size={14} /> CSV
                    </button>
                    <button onClick={() => downloadTxt('606')} className="flex items-center gap-2 border border-slate-200 text-slate-500 px-3 py-1.5 rounded-lg text-sm hover:bg-slate-50">
                      <Download size={14} /> .txt DGII
                    </button>
                    {isSubmitted('606')
                      ? <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg"><CheckCircle size={13} /> Enviado al DGII</span>
                      : <button onClick={() => markSubmitted('606')} className="flex items-center gap-2 border border-blue-200 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-sm hover:bg-blue-100"><CheckCircle size={14} /> Marcar enviado</button>
                    }
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">Registros:</span><span className="font-medium">{report606.totalRecords}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Subtotal:</span><span className="font-medium">{formatCurrency(report606.totals?.subtotal ?? 0)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">ITBIS:</span><span className="font-medium">{formatCurrency(report606.totals?.itbis ?? 0)}</span></div>
                  <div className="flex justify-between border-t pt-2"><span className="font-semibold">Total:</span><span className="font-bold">{formatCurrency(report606.totals?.total ?? 0)}</span></div>
                </div>
              </div>

              {report606?.lines?.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100">
                    <h2 className="font-semibold text-slate-700">Detalle 606 — Compras por Proveedor</h2>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50"><tr>
                      <th className="text-left px-4 py-3 text-slate-600 font-medium">RNC Proveedor</th>
                      <th className="text-left px-4 py-3 text-slate-600 font-medium">NCF</th>
                      <th className="text-left px-4 py-3 text-slate-600 font-medium">Fecha</th>
                      <th className="text-right px-4 py-3 text-slate-600 font-medium">Subtotal</th>
                      <th className="text-right px-4 py-3 text-slate-600 font-medium">ITBIS</th>
                      <th className="text-right px-4 py-3 text-slate-600 font-medium">Total</th>
                    </tr></thead>
                    <tbody>
                      {report606.lines.map((l: any, i: number) => (
                        <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                          <td className="px-4 py-2 font-mono text-slate-500">{l.rnc || '—'}</td>
                          <td className="px-4 py-2 font-mono text-slate-700">{l.ncfNumber}</td>
                          <td className="px-4 py-2 text-slate-500">{l.ncfDate}</td>
                          <td className="px-4 py-2 text-right">{formatCurrency(l.subtotal)}</td>
                          <td className="px-4 py-2 text-right">{formatCurrency(l.itbis)}</td>
                          <td className="px-4 py-2 text-right font-medium">{formatCurrency(l.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-12 text-center text-slate-400 text-sm">
              Presiona "Generar Reportes" para cargar el reporte 606.
            </div>
          )}
        </div>
      )}

      {activeTab === '608' && (
        <div className="space-y-6">
          {report608 ? (
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-semibold text-slate-700">Reporte 608 — NCFs Anulados</h2>
                  <p className="text-xs text-slate-400">Período: {report608.period}</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => downloadTxt('608')} className="flex items-center gap-2 border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg text-sm hover:bg-slate-50">
                    <Download size={14} /> Descargar .txt
                  </button>
                  {isSubmitted('608')
                    ? <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg"><CheckCircle size={13} /> Enviado al DGII</span>
                    : <button onClick={() => markSubmitted('608')} className="flex items-center gap-2 border border-blue-200 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-sm hover:bg-blue-100"><CheckCircle size={14} /> Marcar enviado</button>
                  }
                </div>
              </div>
              <div className="text-sm">
                <div className="flex justify-between"><span className="text-slate-500">NCFs anulados:</span><span className="font-medium">{report608.totalRecords ?? 0}</span></div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-12 text-center text-slate-400 text-sm">
              Presiona "Generar Reportes" para cargar el reporte 608.
            </div>
          )}
        </div>
      )}

      {activeTab === '623' && (
        <div className="space-y-6">
          {report623 ? (
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
              <h2 className="font-semibold text-slate-700 mb-1">Reporte 623 — Retenciones</h2>
              <p className="text-xs text-slate-400 mb-4">Período: {report623.period}</p>
              <div className="flex gap-2 mb-4">
                <button onClick={() => downloadTxt('623')} className="flex items-center gap-2 border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg text-sm hover:bg-slate-50">
                  <Download size={14} /> .txt DGII
                </button>
                {isSubmitted('623')
                  ? <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg"><CheckCircle size={13} /> Enviado al DGII</span>
                  : <button onClick={() => markSubmitted('623')} className="flex items-center gap-2 border border-blue-200 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-sm hover:bg-blue-100"><CheckCircle size={14} /> Marcar enviado</button>}
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Retenciones:</span><span className="font-medium">{report623.totalRecords ?? 0}</span></div>
                <div className="flex justify-between border-t pt-2"><span className="font-semibold">Total Retenido:</span><span className="font-bold">{formatCurrency(report623.totalRetencion ?? 0)}</span></div>
              </div>
              {report623.lines?.length > 0 && (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="border-b border-slate-100 text-slate-500">
                      <th className="text-left pb-2">Proveedor</th><th className="text-left pb-2">RNC</th>
                      <th className="text-left pb-2">NCF</th><th className="text-left pb-2">Tipo</th>
                      <th className="text-right pb-2">Base</th><th className="text-right pb-2">Tasa</th><th className="text-right pb-2">Retenido</th>
                    </tr></thead>
                    <tbody>{report623.lines.map((l: any, i: number) => (
                      <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="py-2">{l.supplierName}</td><td className="py-2">{l.supplierRnc}</td>
                        <td className="py-2">{l.ncfOriginal}</td><td className="py-2">{l.type}</td>
                        <td className="py-2 text-right">{formatCurrency(l.baseAmount)}</td>
                        <td className="py-2 text-right">{l.withholdingRate}%</td>
                        <td className="py-2 text-right font-medium">{formatCurrency(l.withholdingAmount)}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-12 text-center text-slate-400 text-sm">
              Presiona "Generar Reportes" para cargar el reporte 623.
            </div>
          )}
        </div>
      )}

      {activeTab === 'IT1' && (
        <div className="space-y-6">
          {reportIT1 ? (
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
              <h2 className="font-semibold text-slate-700 mb-1">IT-1 — Declaración Jurada ITBIS</h2>
              <p className="text-xs text-slate-400 mb-6">Período: {reportIT1.period}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Ventas</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-500">Ventas gravadas:</span>
                      <span className="font-medium">{formatCurrency(reportIT1.ventasGravadas ?? 0)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-500">Ventas exentas:</span>
                      <span className="font-medium">{formatCurrency(reportIT1.ventasExentas ?? 0)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-500">Total ventas:</span>
                      <span className="font-semibold">{formatCurrency(reportIT1.totalVentas ?? 0)}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">ITBIS en ventas:</span>
                      <span className="font-semibold text-slate-800">{formatCurrency(reportIT1.itbisVentas ?? 0)}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Compras</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-500">Total compras:</span>
                      <span className="font-medium">{formatCurrency(reportIT1.totalCompras ?? 0)}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">ITBIS en compras (acreditable):</span>
                      <span className="font-semibold text-slate-800">{formatCurrency(reportIT1.itbisCompras ?? 0)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className={`mt-6 p-4 rounded-xl border-2 ${(reportIT1.itbisPagar ?? 0) > 0 ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-semibold ${(reportIT1.itbisPagar ?? 0) > 0 ? 'text-red-700' : 'text-green-700'}`}>
                    ITBIS a Pagar
                  </span>
                  <span className={`text-xl font-bold ${(reportIT1.itbisPagar ?? 0) > 0 ? 'text-red-700' : 'text-green-700'}`}>
                    {formatCurrency(reportIT1.itbisPagar ?? 0)}
                  </span>
                </div>
              </div>

              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                <strong>Fecha limite de presentación:</strong> El IT-1 debe presentarse antes del dia 20 del mes siguiente al período declarado.
              </div>

              {/* IT-1 Anual */}
              <div className="mt-6 border-t pt-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-slate-700">IT-1 Anual {year}</h3>
                  <button
                    onClick={async () => {
                      try {
                        const r = await api.get(`/dgii-reports/it1/annual?year=${year}`);
                        const data = r.data?.data ?? r.data;
                        setReportIT1Annual(data);
                      } catch { toast.error('Error cargando IT-1 anual'); }
                    }}
                    className="text-xs border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 text-slate-600"
                  >
                    Ver consolidado anual
                  </button>
                </div>
                {reportIT1Annual && (
                  <div className="space-y-2 text-sm">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-blue-50 rounded-lg p-3"><p className="text-xs text-blue-500">ITBIS Ventas</p><p className="font-bold text-blue-700">{formatCurrency(reportIT1Annual.annual?.itbisVentas ?? 0)}</p></div>
                      <div className="bg-green-50 rounded-lg p-3"><p className="text-xs text-green-500">ITBIS Compras</p><p className="font-bold text-green-700">{formatCurrency(reportIT1Annual.annual?.itbisCompras ?? 0)}</p></div>
                      <div className={`rounded-lg p-3 ${(reportIT1Annual.annual?.itbisPagar ?? 0) > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                        <p className={`text-xs ${(reportIT1Annual.annual?.itbisPagar ?? 0) > 0 ? 'text-red-500' : 'text-green-500'}`}>ITBIS a Pagar</p>
                        <p className={`font-bold ${(reportIT1Annual.annual?.itbisPagar ?? 0) > 0 ? 'text-red-700' : 'text-green-700'}`}>{formatCurrency(reportIT1Annual.annual?.itbisPagar ?? 0)}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-12 text-center text-slate-400 text-sm">
              Presiona "Generar Reportes" para cargar el IT-1.
            </div>
          )}
        </div>
      )}

      {/* Tab: Historial de envíos */}
      {activeTab === 'HISTORIAL' && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <History size={16} className="text-slate-400" />
              <h2 className="font-semibold text-slate-700">Historial de Envíos al DGII — {year}</h2>
            </div>
            <span className="text-xs text-slate-400">{submissions.length} registro{submissions.length !== 1 ? 's' : ''}</span>
          </div>
          {submissions.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">
              <History size={32} className="mx-auto mb-2 opacity-30" />
              No hay envíos registrados para {year}. Usa el botón "Marcar enviado" después de enviar cada reporte al DGII.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-5 py-3 text-slate-500 font-medium">Reporte</th>
                  <th className="text-left px-5 py-3 text-slate-500 font-medium">Período</th>
                  <th className="text-left px-5 py-3 text-slate-500 font-medium">Enviado por</th>
                  <th className="text-left px-5 py-3 text-slate-500 font-medium">Fecha registro</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {submissions.map(s => (
                  <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs font-semibold px-2 py-1 rounded-full">
                        <CheckCircle size={11} /> {s.reportType}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono text-slate-700">{s.period}</td>
                    <td className="px-5 py-3 text-slate-500">{s.submittedBy ?? '—'}</td>
                    <td className="px-5 py-3 text-slate-400 text-xs">
                      {formatDateTime(s.createdAt)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button onClick={() => deleteSubmission(s.id)} className="text-slate-300 hover:text-red-500 transition-colors" title="Eliminar registro">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Validar RNC — siempre visible */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 mt-6">
        <h2 className="font-semibold text-slate-700 mb-3">Validar RNC / Cédula</h2>
        <div className="flex gap-3 items-end">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">RNC o Cédula</label>
            <input className="w-48 border rounded-lg px-3 py-2 text-sm" value={rnc} onChange={e => setRnc(e.target.value)} placeholder="130123456" />
          </div>
          <button onClick={validateRnc} className="bg-slate-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-slate-800">Validar</button>
        </div>
        {rncResult && (
          <div className={`mt-3 p-3 rounded-lg text-sm ${rncResult.valid ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            <strong>{rncResult.valid ? '✓ Válido' : '✗ Inválido'}</strong> — {rncResult.status}
          </div>
        )}
      </div>
    </div>
  );
}
