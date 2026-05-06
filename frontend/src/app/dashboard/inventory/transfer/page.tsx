'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import api from '@/lib/api';
import { toast } from 'sonner';
import { ArrowRightLeft, History, Package, Search } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface Branch { id: string; name: string; isActive: boolean; isMain: boolean; }
interface StockLevel { productId: string; productName: string; currentStock: number; }
interface Transfer {
  id: string;
  productName: string;
  branchId: string;
  targetBranchId: string;
  quantity: number;
  movementDate: string;
  reason: string;
  notes?: string;
  transferId: string;
}

export default function InventoryTransferPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [stock, setStock] = useState<StockLevel[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [branchNames, setBranchNames] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    fromBranchId: '',
    toBranchId: '',
    productId: '',
    productName: '',
    quantity: '',
    notes: '',
  });
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'transfer' | 'history'>('transfer');

  const load = async () => {
    const [brR, trR] = await Promise.all([
      api.get('/branches').catch(() => ({ data: { data: [] } })),
      api.get('/inventory/transfers').catch(() => ({ data: { data: [] } })),
    ]);
    const brList: Branch[] = brR.data.data ?? [];
    setBranches(brList.filter(b => b.isActive));
    const nameMap: Record<string, string> = {};
    brList.forEach(b => { nameMap[b.id] = b.name; });
    setBranchNames(nameMap);
    const trList: Transfer[] = trR.data.data ?? [];
    // Only show TRANSFER_OUT to avoid duplicates
    setTransfers(trList.filter((t: Transfer) => t.reason === 'TRANSFER_OUT'));
  };

  const loadStock = async (branchId: string) => {
    if (!branchId) { setStock([]); return; }
    try {
      // Temporarily set the branch filter header manually
      const r = await api.get('/inventory/stock', { headers: { 'X-Branch-Filter': branchId } });
      setStock((r.data.data ?? r.data ?? []).filter((s: StockLevel) => s.currentStock > 0));
    } catch { setStock([]); }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { loadStock(form.fromBranchId); setForm(f => ({ ...f, productId: '', productName: '' })); }, [form.fromBranchId]);

  const filteredStock = stock.filter(s =>
    s.productName.toLowerCase().includes(search.toLowerCase()),
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fromBranchId || !form.toBranchId || !form.productId || !form.quantity) {
      toast.error('Completa todos los campos requeridos');
      return;
    }
    if (form.fromBranchId === form.toBranchId) {
      toast.error('El origen y destino no pueden ser la misma sucursal');
      return;
    }
    setSaving(true);
    try {
      await api.post('/inventory/transfer', {
        fromBranchId: form.fromBranchId,
        toBranchId: form.toBranchId,
        productId: form.productId,
        productName: form.productName,
        quantity: parseFloat(form.quantity),
        notes: form.notes || undefined,
      });
      toast.success('Transferencia realizada correctamente');
      setForm(f => ({ ...f, productId: '', productName: '', quantity: '', notes: '' }));
      load();
      loadStock(form.fromBranchId);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Error al realizar la transferencia');
    } finally { setSaving(false); }
  };

  const selectedStock = stock.find(s => s.productId === form.productId);

  return (
    <div>
      <PageHeader title="Transferencia de Inventario" description="Mueve stock entre sucursales" />

      <div className="flex gap-1 mb-6 border-b border-slate-200">
        <button onClick={() => setTab('transfer')} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === 'transfer' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
          <ArrowRightLeft size={15} /> Nueva transferencia
        </button>
        <button onClick={() => setTab('history')} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === 'history' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
          <History size={15} /> Historial
        </button>
      </div>

      {tab === 'transfer' && (
        <div className="max-w-2xl">
          <form onSubmit={submit} className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-5">

            {/* Origen / Destino */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Sucursal origen *</label>
                <select
                  required
                  value={form.fromBranchId}
                  onChange={e => setForm(f => ({ ...f, fromBranchId: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccionar...</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Sucursal destino *</label>
                <select
                  required
                  value={form.toBranchId}
                  onChange={e => setForm(f => ({ ...f, toBranchId: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccionar...</option>
                  {branches.filter(b => b.id !== form.fromBranchId).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            </div>

            {/* Selector de producto */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Producto *</label>
              {!form.fromBranchId ? (
                <p className="text-xs text-slate-400 py-2">Selecciona la sucursal origen primero</p>
              ) : stock.length === 0 ? (
                <p className="text-xs text-slate-400 py-2">Sin stock disponible en esta sucursal</p>
              ) : (
                <>
                  <div className="relative mb-2">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      placeholder="Buscar producto..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="w-full pl-8 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="border border-slate-200 rounded-lg max-h-48 overflow-y-auto">
                    {filteredStock.map(s => (
                      <button
                        key={s.productId}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, productId: s.productId, productName: s.productName }))}
                        className={`w-full flex items-center justify-between px-3 py-2.5 text-sm text-left hover:bg-slate-50 border-b border-slate-50 last:border-0 transition-colors ${form.productId === s.productId ? 'bg-blue-50 text-blue-700' : 'text-slate-700'}`}
                      >
                        <div className="flex items-center gap-2">
                          <Package size={13} className="text-slate-400 flex-shrink-0" />
                          <span>{s.productName}</span>
                        </div>
                        <span className="text-xs font-mono text-slate-500">Stock: {s.currentStock}</span>
                      </button>
                    ))}
                    {filteredStock.length === 0 && (
                      <p className="text-center text-xs text-slate-400 py-4">Sin resultados</p>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Cantidad */}
            {form.productId && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Cantidad *
                  {selectedStock && <span className="text-slate-400 font-normal ml-1">(disponible: {selectedStock.currentStock})</span>}
                </label>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  max={selectedStock?.currentStock}
                  value={form.quantity}
                  onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>
            )}

            {/* Notas */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Notas (opcional)</label>
              <input
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Motivo de la transferencia..."
              />
            </div>

            {/* Resumen */}
            {form.fromBranchId && form.toBranchId && form.productId && form.quantity && (
              <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
                <p className="text-xs font-semibold text-blue-700 mb-1">Resumen de transferencia</p>
                <p className="text-xs text-blue-600">
                  <strong>{form.quantity}</strong> unidad(es) de <strong>{form.productName}</strong>
                  {' '}de <strong>{branchNames[form.fromBranchId]}</strong> hacia <strong>{branchNames[form.toBranchId]}</strong>
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={saving || !form.fromBranchId || !form.toBranchId || !form.productId || !form.quantity}
              className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? 'Procesando...' : <><ArrowRightLeft size={15} /> Realizar transferencia</>}
            </button>
          </form>
        </div>
      )}

      {tab === 'history' && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['Fecha', 'Producto', 'Cantidad', 'Desde', 'Hasta', 'Notas'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-slate-500 font-medium text-xs">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transfers.length === 0 && (
                <tr><td colSpan={6} className="text-center py-8 text-slate-400">Sin transferencias registradas</td></tr>
              )}
              {transfers.map(t => (
                <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-500">{new Date(t.movementDate).toLocaleDateString('es-DO')}</td>
                  <td className="px-4 py-3 font-medium">{t.productName}</td>
                  <td className="px-4 py-3 font-mono">{t.quantity}</td>
                  <td className="px-4 py-3 text-slate-500">{branchNames[t.branchId] ?? t.branchId}</td>
                  <td className="px-4 py-3 text-slate-500">{branchNames[t.targetBranchId ?? ''] ?? t.targetBranchId}</td>
                  <td className="px-4 py-3 text-slate-400">{t.notes ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
