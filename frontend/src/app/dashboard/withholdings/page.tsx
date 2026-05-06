'use client';
import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import api from '@/lib/api';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Plus, Trash2, FileText, Calculator } from 'lucide-react';

interface Withholding {
  id: string;
  type: string;
  supplierName: string;
  supplierRnc?: string;
  supplierCedula?: string;
  ncfOriginal?: string;
  withholdingDate: string;
  baseAmount: number;
  withholdingRate: number;
  withholdingAmount: number;
  netAmount: number;
  notes?: string;
  period?: string;
}

const TYPE_OPTIONS = [
  { value: 'ITBIS_30', label: 'ITBIS 30% (Servicios)', rate: 30 },
  { value: 'ISR_10',   label: 'ISR 10% (Personas Físicas)', rate: 10 },
  { value: 'ISR_15',   label: 'ISR 15% (No Residentes)', rate: 15 },
];

const TYPE_LABELS: Record<string, string> = {
  ITBIS_30: 'ITBIS 30%',
  ISR_10: 'ISR 10%',
  ISR_15: 'ISR 15%',
};

const TYPE_COLORS: Record<string, string> = {
  ITBIS_30: 'bg-blue-100 text-blue-700',
  ISR_10: 'bg-purple-100 text-purple-700',
  ISR_15: 'bg-orange-100 text-orange-700',
};

const emptyForm = {
  type: 'ITBIS_30',
  supplierName: '',
  supplierRnc: '',
  supplierCedula: '',
  ncfOriginal: '',
  withholdingDate: new Date().toISOString().split('T')[0],
  baseAmount: '',
  withholdingRate: '30',
  withholdingAmount: '',
  netAmount: '',
  notes: '',
  period: '',
};

export default function WithholdingsPage() {
  const [items, setItems] = useState<Withholding[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get('/withholdings');
      setItems(r.data?.data ?? r.data ?? []);
    } catch {
      toast.error('Error al cargar las retenciones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const currentMonthItems = items.filter(w => {
    const d = new Date(w.withholdingDate);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });

  const totalITBIS = currentMonthItems
    .filter(w => w.type === 'ITBIS_30')
    .reduce((s, w) => s + Number(w.withholdingAmount), 0);

  const totalISR = currentMonthItems
    .filter(w => w.type === 'ISR_10' || w.type === 'ISR_15')
    .reduce((s, w) => s + Number(w.withholdingAmount), 0);

  const handleTypeChange = (type: string) => {
    const opt = TYPE_OPTIONS.find(o => o.value === type);
    const rate = opt ? String(opt.rate) : form.withholdingRate;
    const base = parseFloat(form.baseAmount) || 0;
    const rateNum = parseFloat(rate) || 0;
    const withheld = base * rateNum / 100;
    const net = base - withheld;
    setForm(f => ({
      ...f,
      type,
      withholdingRate: rate,
      withholdingAmount: withheld ? withheld.toFixed(2) : '',
      netAmount: net ? net.toFixed(2) : '',
    }));
  };

  const handleAmountOrRateChange = (field: 'baseAmount' | 'withholdingRate', value: string) => {
    const base = field === 'baseAmount' ? parseFloat(value) || 0 : parseFloat(form.baseAmount) || 0;
    const rate = field === 'withholdingRate' ? parseFloat(value) || 0 : parseFloat(form.withholdingRate) || 0;
    const withheld = base * rate / 100;
    const net = base - withheld;
    setForm(f => ({
      ...f,
      [field]: value,
      withholdingAmount: (base > 0 && rate > 0) ? withheld.toFixed(2) : '',
      netAmount: (base > 0 && rate > 0) ? net.toFixed(2) : '',
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/withholdings', {
        type: form.type,
        supplierName: form.supplierName,
        supplierRnc: form.supplierRnc || undefined,
        supplierCedula: form.supplierCedula || undefined,
        ncfOriginal: form.ncfOriginal || undefined,
        withholdingDate: form.withholdingDate,
        baseAmount: parseFloat(form.baseAmount),
        withholdingRate: parseFloat(form.withholdingRate),
        notes: form.notes || undefined,
        period: form.period || undefined,
      });
      toast.success('Retención registrada');
      setShowModal(false);
      setForm({ ...emptyForm });
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/withholdings/${deleteId}`);
      toast.success('Retención eliminada');
      setDeleteId(null);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Error al eliminar');
    }
  };

  return (
    <div>
      <PageHeader
        title="Retenciones"
        description="Gestión de retenciones de ITBIS e ISR (formulario IR-17)"
        action={
          <button
            onClick={() => { setForm({ ...emptyForm }); setShowModal(true); }}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            <Plus size={16} />
            Nueva Retención
          </button>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-500">ITBIS Retenido (mes)</span>
            <Calculator size={18} className="text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-slate-800">{formatCurrency(totalITBIS)}</p>
          <p className="text-xs text-slate-400 mt-1">{currentMonthItems.filter(w => w.type === 'ITBIS_30').length} retenciones ITBIS</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-500">ISR Retenido (mes)</span>
            <FileText size={18} className="text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-slate-800">{formatCurrency(totalISR)}</p>
          <p className="text-xs text-slate-400 mt-1">{currentMonthItems.filter(w => w.type === 'ISR_10' || w.type === 'ISR_15').length} retenciones ISR</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-500">Total Retenido (mes)</span>
            <Calculator size={18} className="text-green-500" />
          </div>
          <p className="text-2xl font-bold text-slate-800">{formatCurrency(totalITBIS + totalISR)}</p>
          <p className="text-xs text-slate-400 mt-1">{currentMonthItems.length} registros en {currentPeriod}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="text-left px-4 py-3 text-slate-600 font-medium">Fecha</th>
              <th className="text-left px-4 py-3 text-slate-600 font-medium">Tipo</th>
              <th className="text-left px-4 py-3 text-slate-600 font-medium">Proveedor</th>
              <th className="text-left px-4 py-3 text-slate-600 font-medium">RNC / Cédula</th>
              <th className="text-left px-4 py-3 text-slate-600 font-medium">NCF Original</th>
              <th className="text-right px-4 py-3 text-slate-600 font-medium">Base</th>
              <th className="text-right px-4 py-3 text-slate-600 font-medium">Tasa %</th>
              <th className="text-right px-4 py-3 text-slate-600 font-medium">Retención</th>
              <th className="text-right px-4 py-3 text-slate-600 font-medium">Neto Pagado</th>
              <th className="text-right px-4 py-3 text-slate-600 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={10} className="text-center py-8 text-slate-400">Cargando...</td></tr>
            )}
            {!loading && items.length === 0 && (
              <tr><td colSpan={10} className="text-center py-8 text-slate-400">No hay retenciones registradas</td></tr>
            )}
            {!loading && items.map(w => (
              <tr key={w.id} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-500">{formatDate(w.withholdingDate)}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[w.type] ?? 'bg-slate-100 text-slate-600'}`}>
                    {TYPE_LABELS[w.type] ?? w.type}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium text-slate-700">{w.supplierName}</td>
                <td className="px-4 py-3 font-mono text-slate-500 text-xs">{w.supplierRnc ?? w.supplierCedula ?? '—'}</td>
                <td className="px-4 py-3 font-mono text-slate-500 text-xs">{w.ncfOriginal ?? '—'}</td>
                <td className="px-4 py-3 text-right text-slate-700">{formatCurrency(Number(w.baseAmount))}</td>
                <td className="px-4 py-3 text-right text-slate-500">{Number(w.withholdingRate)}%</td>
                <td className="px-4 py-3 text-right font-semibold text-red-600">{formatCurrency(Number(w.withholdingAmount))}</td>
                <td className="px-4 py-3 text-right font-semibold text-green-700">{formatCurrency(Number(w.netAmount))}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => setDeleteId(w.id)}
                    className="text-red-400 hover:text-red-600 transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* New Withholding Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">Nueva Retención</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Type */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Tipo de Retención *</label>
                <select
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.type}
                  onChange={e => handleTypeChange(e.target.value)}
                  required
                >
                  {TYPE_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Supplier Name */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Nombre del Proveedor *</label>
                <input
                  type="text"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.supplierName}
                  onChange={e => setForm(f => ({ ...f, supplierName: e.target.value }))}
                  required
                  placeholder="Nombre completo o razón social"
                />
              </div>

              {/* RNC / Cedula */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">RNC</label>
                  <input
                    type="text"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.supplierRnc}
                    onChange={e => setForm(f => ({ ...f, supplierRnc: e.target.value }))}
                    placeholder="000-000000-0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Cédula</label>
                  <input
                    type="text"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.supplierCedula}
                    onChange={e => setForm(f => ({ ...f, supplierCedula: e.target.value }))}
                    placeholder="000-0000000-0"
                  />
                </div>
              </div>

              {/* NCF Original & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">NCF Original</label>
                  <input
                    type="text"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.ncfOriginal}
                    onChange={e => setForm(f => ({ ...f, ncfOriginal: e.target.value }))}
                    placeholder="E310000000001"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Fecha *</label>
                  <input
                    type="date"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.withholdingDate}
                    onChange={e => setForm(f => ({ ...f, withholdingDate: e.target.value }))}
                    required
                  />
                </div>
              </div>

              {/* Base Amount & Rate */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Monto Base *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.baseAmount}
                    onChange={e => handleAmountOrRateChange('baseAmount', e.target.value)}
                    required
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Tasa % *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.withholdingRate}
                    onChange={e => handleAmountOrRateChange('withholdingRate', e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Calculated fields (read-only display) */}
              {form.withholdingAmount && (
                <div className="grid grid-cols-2 gap-3 bg-slate-50 rounded-lg p-3">
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">Monto Retenido</p>
                    <p className="text-base font-bold text-red-600">
                      {formatCurrency(parseFloat(form.withholdingAmount) || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">Neto a Pagar</p>
                    <p className="text-base font-bold text-green-700">
                      {formatCurrency(parseFloat(form.netAmount) || 0)}
                    </p>
                  </div>
                </div>
              )}

              {/* Period & Notes */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Período (YYYY-MM)</label>
                  <input
                    type="month"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.period}
                    onChange={e => setForm(f => ({ ...f, period: e.target.value }))}
                    placeholder="2025-03"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Notas</label>
                <textarea
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Observaciones opcionales..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 border border-slate-200 text-slate-600 py-2 rounded-lg text-sm hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Guardar Retención'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Eliminar Retención</h3>
            <p className="text-sm text-slate-500 mb-6">¿Estás seguro de que deseas eliminar esta retención? Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 border border-slate-200 text-slate-600 py-2 rounded-lg text-sm hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-700"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
