'use client';
import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Plus, Trash2, Search, Receipt, Filter } from 'lucide-react';
import { BranchBadge } from '@/components/ui/branch-badge';
import { formatCurrency, formatDate } from '@/lib/utils';

const CATEGORIES = [
  { value: 'ALQUILER',           label: 'Alquiler' },
  { value: 'ELECTRICIDAD',       label: 'Electricidad' },
  { value: 'COMUNICACIONES',     label: 'Comunicaciones' },
  { value: 'TRANSPORTE',         label: 'Transporte' },
  { value: 'SUELDOS',            label: 'Sueldos' },
  { value: 'MARKETING',          label: 'Marketing' },
  { value: 'SERVICIOS_BANCARIOS',label: 'Servicios Bancarios' },
  { value: 'MANTENIMIENTO',      label: 'Mantenimiento' },
  { value: 'PAPELERIA',          label: 'Papelería' },
  { value: 'IMPUESTOS',          label: 'Impuestos' },
  { value: 'OTROS',              label: 'Otros' },
];

const PAYMENT_METHODS = [
  { value: 'EFECTIVO',           label: 'Efectivo' },
  { value: 'TRANSFERENCIA',      label: 'Transferencia' },
  { value: 'TARJETA',            label: 'Tarjeta' },
  { value: 'CHEQUE',             label: 'Cheque' },
];

function categoryLabel(value: string) {
  return CATEGORIES.find(c => c.value === value)?.label ?? value;
}

interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  expenseDate: string;
  supplierName?: string;
  supplierRnc?: string;
  ncfNumber?: string;
  reference?: string;
  notes?: string;
  hasItbis: boolean;
  itbisAmount: number;
  paymentMethod?: string;
}

const emptyForm = {
  category: '',
  description: '',
  amount: '',
  expenseDate: new Date().toISOString().split('T')[0],
  supplierName: '',
  supplierRnc: '',
  ncfNumber: '',
  reference: '',
  notes: '',
  hasItbis: false,
  itbisAmount: '',
  paymentMethod: '',
};

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

  // Filters
  const [filterCategory, setFilterCategory] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [search, setSearch] = useState('');

  const load = () => {
    const params = new URLSearchParams();
    if (filterCategory) params.set('category', filterCategory);
    if (filterFrom)     params.set('from', filterFrom);
    if (filterTo)       params.set('to', filterTo);
    api.get(`/expenses?${params.toString()}`)
      .then(r => setExpenses(r.data?.data ?? r.data ?? []))
      .catch(() => {});
  };

  useEffect(() => { load(); }, [filterCategory, filterFrom, filterTo]);

  const filtered = search
    ? expenses.filter(e =>
        e.description.toLowerCase().includes(search.toLowerCase()) ||
        (e.supplierName ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (e.ncfNumber ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : expenses;

  const setField = (key: keyof typeof emptyForm, value: string | boolean) =>
    setForm(f => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.category) { toast.error('Selecciona una categoría'); return; }
    if (!form.description) { toast.error('Ingresa una descripción'); return; }
    if (!form.amount || parseFloat(form.amount) <= 0) { toast.error('Ingresa un monto válido'); return; }
    setLoading(true);
    try {
      await api.post('/expenses', {
        category: form.category,
        description: form.description,
        amount: parseFloat(form.amount),
        expenseDate: form.expenseDate,
        supplierName: form.supplierName || undefined,
        supplierRnc: form.supplierRnc || undefined,
        ncfNumber: form.ncfNumber || undefined,
        reference: form.reference || undefined,
        notes: form.notes || undefined,
        hasItbis: form.hasItbis,
        itbisAmount: form.hasItbis ? parseFloat(form.itbisAmount || '0') : 0,
        paymentMethod: form.paymentMethod || undefined,
      });
      toast.success('Gasto registrado');
      setShowModal(false);
      setForm({ ...emptyForm });
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/expenses/${deleteId}`);
      toast.success('Gasto eliminado');
      setDeleteId(null);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Error al eliminar');
    }
  };

  return (
    <div>
      <PageHeader
        title="Gastos"
        description="Control de gastos categorizados del negocio"
        action={
          <button
            onClick={() => { setForm({ ...emptyForm }); setShowModal(true); }}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
          >
            <Plus size={16} /> Nuevo Gasto
          </button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            placeholder="Buscar por descripción, proveedor o NCF..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={15} className="text-slate-400" />
          <select
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
          >
            <option value="">Todas las categorías</option>
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <input
          type="date"
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
          value={filterFrom}
          onChange={e => setFilterFrom(e.target.value)}
          title="Desde"
        />
        <input
          type="date"
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
          value={filterTo}
          onChange={e => setFilterTo(e.target.value)}
          title="Hasta"
        />
        {(filterCategory || filterFrom || filterTo) && (
          <button
            onClick={() => { setFilterCategory(''); setFilterFrom(''); setFilterTo(''); }}
            className="text-xs text-slate-500 hover:text-slate-700 border border-slate-200 px-3 py-2 rounded-lg"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="text-left px-4 py-3 text-slate-600 font-medium">Fecha</th>
              <th className="text-left px-4 py-3 text-slate-600 font-medium">Categoría</th>
              <th className="text-left px-4 py-3 text-slate-600 font-medium">Descripción</th>
              <th className="text-left px-4 py-3 text-slate-600 font-medium">Proveedor</th>
              <th className="text-left px-4 py-3 text-slate-600 font-medium">NCF</th>
              <th className="text-right px-4 py-3 text-slate-600 font-medium">Monto</th>
              <th className="text-right px-4 py-3 text-slate-600 font-medium">ITBIS</th>
              <th className="text-left px-4 py-3 text-slate-600 font-medium">Método</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center py-10 text-slate-400">
                  <Receipt size={32} className="mx-auto mb-2 opacity-30" />
                  No hay gastos registrados
                </td>
              </tr>
            )}
            {filtered.map(e => (
              <tr key={e.id} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatDate(e.expenseDate)}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                    {categoryLabel(e.category)}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-700 max-w-[200px] truncate">{e.description}</td>
                <td className="px-4 py-3 text-slate-500">{e.supplierName ?? '—'}</td>
                <td className="px-4 py-3 font-mono text-slate-400 text-xs">{e.ncfNumber ?? '—'}</td>
                <td className="px-4 py-3 text-right font-semibold text-slate-800">{formatCurrency(e.amount)}</td>
                <td className="px-4 py-3 text-right text-slate-500">
                  {e.hasItbis ? formatCurrency(e.itbisAmount) : '—'}
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">{e.paymentMethod ?? '—'}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => setDeleteId(e.id)}
                    className="text-red-400 hover:text-red-600 transition-colors"
                    title="Eliminar gasto"
                  >
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <h2 className="font-semibold text-slate-800 text-lg flex items-center gap-2">
                  <Receipt size={18} className="text-blue-600" /> Nuevo Gasto
                </h2>
                <BranchBadge />
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Categoría *</label>
                  <select
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                    value={form.category}
                    onChange={e => setField('category', e.target.value)}
                    required
                  >
                    <option value="">Seleccionar...</option>
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Fecha *</label>
                  <input
                    type="date"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                    value={form.expenseDate}
                    onChange={e => setField('expenseDate', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Descripción *</label>
                <input
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="Ej: Pago de alquiler del local"
                  value={form.description}
                  onChange={e => setField('description', e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Monto *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="0.00"
                    value={form.amount}
                    onChange={e => setField('amount', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Método de Pago</label>
                  <select
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                    value={form.paymentMethod}
                    onChange={e => setField('paymentMethod', e.target.value)}
                  >
                    <option value="">Seleccionar...</option>
                    {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Proveedor</label>
                  <input
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="Nombre del proveedor"
                    value={form.supplierName}
                    onChange={e => setField('supplierName', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">RNC del Proveedor</label>
                  <input
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="000-00000-0"
                    value={form.supplierRnc}
                    onChange={e => setField('supplierRnc', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Número de NCF</label>
                  <input
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="B1100000001"
                    value={form.ncfNumber}
                    onChange={e => setField('ncfNumber', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Referencia</label>
                  <input
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="Número de referencia"
                    value={form.reference}
                    onChange={e => setField('reference', e.target.value)}
                  />
                </div>
              </div>

              {/* ITBIS */}
              <div className="flex items-start gap-4">
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="hasItbis"
                    checked={form.hasItbis}
                    onChange={e => setField('hasItbis', e.target.checked)}
                    className="w-4 h-4"
                  />
                  <label htmlFor="hasItbis" className="text-sm text-slate-600">Incluye ITBIS</label>
                </div>
                {form.hasItbis && (
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-slate-600 mb-1">Monto de ITBIS</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="0.00"
                      value={form.itbisAmount}
                      onChange={e => setField('itbisAmount', e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Notas</label>
                <textarea
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
                  rows={2}
                  placeholder="Observaciones adicionales..."
                  value={form.notes}
                  onChange={e => setField('notes', e.target.value)}
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Guardando...' : 'Registrar Gasto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setDeleteId(null)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="font-semibold text-slate-800 mb-2">¿Eliminar gasto?</h3>
            <p className="text-sm text-slate-500 mb-5">Esta acción no se puede deshacer.</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
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
