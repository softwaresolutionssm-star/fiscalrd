'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Plus, AlertTriangle, Bell, Wrench } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useBranch } from '@/contexts/branch-context';
import { useAuth } from '@/contexts/auth-context';

interface Product { id: string; name: string; costPrice?: number | null; }

interface StockItem {
  productId: string;
  productName: string;
  currentStock: number;
  totalIn: number;
  totalOut: number;
  branchId?: string | null;
  branchName?: string | null;
}

interface Movement {
  id: string;
  date: string;
  productId: string;
  productName: string;
  type: 'IN' | 'OUT' | 'ADJUSTMENT';
  reason: string;
  quantity: number;
  unitCost: number;
  reference?: string;
  branchId?: string | null;
  branchName?: string | null;
}

const typeConfig: Record<string, { label: string; color: string }> = {
  IN: { label: 'Entrada', color: 'bg-green-100 text-green-700' },
  OUT: { label: 'Salida', color: 'bg-red-100 text-red-700' },
  ADJUSTMENT: { label: 'Ajuste', color: 'bg-slate-100 text-slate-600' },
};

const REASONS = [
  { value: 'MANUAL', label: 'Ajuste de inventario' },
  { value: 'DAMAGED', label: 'Producto dañado / perdido' },
  { value: 'RETURN', label: 'Devolución a proveedor' },
];

const emptyForm = {
  productName: '',
  productId: '',
  type: 'ADJUSTMENT',
  reason: 'MANUAL',
  quantity: '',
  unitCost: '',
  movementDate: new Date().toISOString().slice(0, 10),
  reference: '',
  notes: '',
};

interface LowStockItem { productId: string; productName: string; currentStock: number; minStock: number; }

export default function InventoryPage() {
  const { activeBranchId } = useBranch();
  const { user } = useAuth();
  const [tab, setTab] = useState<'stock' | 'movements'>('stock');
  const [stock, setStock] = useState<StockItem[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);

  // Para owner: usa el selector de sucursal del sidebar (activeBranchId)
  // Para admin/manager con sucursal propia: el backend filtra por su JWT branchId automáticamente
  const effectiveBranchId = user?.role === 'owner' ? activeBranchId : (user?.branchId ?? null);

  // Solo el owner necesita enviar branchId como query param (no-owners el backend lo saca del JWT)
  const branchQ = user?.role === 'owner' && activeBranchId ? `?branchId=${activeBranchId}` : '';

  // Mostrar columna "Sucursal" solo cuando realmente se están viendo todas (effectiveBranchId = null)
  const showBranchColumn = effectiveBranchId === null;

  const loadStock = () =>
    api.get(`/inventory/stock${branchQ}`).then(r => setStock(r.data.data ?? [])).catch(() => null);

  const loadMovements = () =>
    api.get(`/inventory/movements${branchQ}`).then(r => setMovements(r.data.data ?? [])).catch(() => null);

  const loadLowStock = () =>
    api.get(`/inventory/low-stock${branchQ}`).then(r => setLowStock(r.data.data ?? r.data ?? [])).catch(() => null);

  useEffect(() => {
    loadStock();
    loadMovements();
    loadLowStock();
    api.get('/products').then(r => setProducts(r.data.data ?? [])).catch(() => null);
  }, [activeBranchId, user?.branchId]);

  const [repairing, setRepairing] = useState(false);

  const runRepair = async () => {
    setRepairing(true);
    try {
      const r = await api.post('/inventory/repair');
      const d = r.data.data ?? r.data;
      console.log('[Inventory repair]', d);
      toast.success(`Reparación completa: ${d.movementsCreated} movimientos creados, ${d.repaired} corregidos`);
      await Promise.all([loadStock(), loadMovements(), loadLowStock()]);
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Error en reparación');
    } finally {
      setRepairing(false);
    }
  };

  const outOfStock = stock.filter(s => s.currentStock <= 0);
  const belowMin = lowStock.filter(l => l.currentStock > 0);

  const submitMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/inventory/movements', {
        productId: form.productId,
        productName: form.productName,
        type: form.type,
        reason: form.reason,
        quantity: parseFloat(form.quantity),
        unitCost: parseFloat(form.unitCost) || 0,
        reference: form.reference || undefined,
        notes: form.notes || undefined,
        movementDate: new Date(form.movementDate).toISOString(),
      });
      toast.success('Movimiento registrado');
      setForm(emptyForm);
      setShowForm(false);
      await Promise.all([loadStock(), loadMovements()]);
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Error al registrar movimiento');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Inventario"
        description="Control de stock y movimientos de productos"
        action={
          <div className="flex gap-2">
            <button
              onClick={runRepair}
              disabled={repairing}
              title="Sincronizar stock con compras registradas"
              className="flex items-center gap-2 border border-slate-200 bg-white text-slate-600 px-3 py-2 rounded-lg text-sm hover:bg-slate-50 disabled:opacity-50"
            >
              <Wrench size={15} /> {repairing ? 'Reparando...' : 'Sincronizar'}
            </button>
            {tab === 'movements' && (
              <button
                onClick={() => setShowForm(v => !v)}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
              >
                <Plus size={16} /> Nuevo Movimiento
              </button>
            )}
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-6 gap-1">
        {[
          { key: 'stock', label: 'Stock Actual' },
          { key: 'movements', label: 'Movimientos' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as 'stock' | 'movements')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              tab === t.key
                ? 'bg-white border border-b-white border-slate-200 text-blue-600 -mb-px'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Stock Tab */}
      {tab === 'stock' && (
        <div className="space-y-4">
          {belowMin.length > 0 && (
            <div className="flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-sm">
              <div className="flex items-center gap-3">
                <AlertTriangle size={16} className="shrink-0" />
                <span>
                  <strong>{belowMin.length} producto(s) con stock bajo:</strong>{' '}
                  {belowMin.map(l => `${l.productName} (${l.currentStock}/${l.minStock})`).join(', ')}
                </span>
              </div>
              <button
                onClick={async () => {
                  try {
                    const res = await api.post('/inventory/send-low-stock-alert');
                    const data = res.data.data ?? res.data;
                    if (data.sent) toast.success(`Alerta enviada por email (${data.itemCount} productos)`);
                    else toast.info('No hay email configurado para este negocio');
                  } catch { toast.error('Error al enviar alerta'); }
                }}
                className="flex items-center gap-1.5 text-xs font-semibold bg-amber-100 hover:bg-amber-200 text-amber-800 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
              >
                <Bell size={13} /> Alertar por Email
              </button>
            </div>
          )}

          {outOfStock.length > 0 && (
            <div className="flex items-center justify-between gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
              <div className="flex items-center gap-3">
                <AlertTriangle size={16} className="shrink-0" />
                <span>
                  <strong>{outOfStock.length} producto(s) sin stock:</strong>{' '}
                  {outOfStock.map(s => s.productName).join(', ')}
                </span>
              </div>
              <button
                onClick={async () => {
                  try {
                    const res = await api.post('/inventory/send-low-stock-alert');
                    const data = res.data.data ?? res.data;
                    if (data.sent) toast.success(`Alerta enviada por email (${data.itemCount} productos)`);
                    else toast.info('No hay email configurado para este negocio o no hay productos con stock bajo');
                  } catch { toast.error('Error al enviar alerta'); }
                }}
                className="flex items-center gap-1.5 text-xs font-semibold bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
              >
                <Bell size={13} /> Alertar por Email
              </button>
            </div>
          )}

          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-4 py-3 text-slate-500 font-medium">Producto</th>
                  {showBranchColumn && <th className="text-left px-4 py-3 text-slate-500 font-medium">Sucursal</th>}
                  <th className="text-right px-4 py-3 text-slate-500 font-medium">Stock Actual</th>
                  <th className="text-right px-4 py-3 text-slate-500 font-medium">Entradas Totales</th>
                  <th className="text-right px-4 py-3 text-slate-500 font-medium">Salidas Totales</th>
                </tr>
              </thead>
              <tbody>
                {stock.length === 0 && (
                  <tr><td colSpan={showBranchColumn ? 5 : 4} className="text-center py-8 text-slate-400">Sin datos de stock</td></tr>
                )}
                {stock.map((s, i) => {
                  const lowItem = lowStock.find(l => l.productId === s.productId);
                  const isBelowMin = lowItem && s.currentStock > 0;
                  const isOutOfStock = s.currentStock <= 0;
                  return (
                    <tr key={`${s.productId}-${s.branchId ?? i}`} className={`border-b border-slate-50 hover:bg-slate-50 ${isOutOfStock ? 'bg-red-50/40' : isBelowMin ? 'bg-amber-50/40' : ''}`}>
                      <td className="px-4 py-3 font-medium text-slate-700">
                        {s.productName}
                        {isBelowMin && !isOutOfStock && (
                          <span className="ml-2 text-[10px] font-semibold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">stock bajo</span>
                        )}
                      </td>
                      {showBranchColumn && (
                        <td className="px-4 py-3 text-slate-500">
                          {s.branchName
                            ? <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full">{s.branchName}</span>
                            : <span className="text-slate-300">—</span>}
                        </td>
                      )}
                      <td className={`px-4 py-3 text-right font-semibold ${isOutOfStock ? 'text-red-600' : isBelowMin ? 'text-amber-600' : 'text-slate-800'}`}>
                        {s.currentStock}
                        {lowItem && <span className="text-xs font-normal text-slate-400 ml-1">/ mín {lowItem.minStock}</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-green-600 font-medium">{s.totalIn}</td>
                      <td className="px-4 py-3 text-right text-red-600 font-medium">{s.totalOut}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Movements Tab */}
      {tab === 'movements' && (
        <div className="space-y-4">
          {showForm && (
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
              <h3 className="font-semibold text-slate-700 mb-1">Registrar Ajuste de Inventario</h3>
              <p className="text-xs text-amber-600 mb-4 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Este módulo es solo para <strong>correcciones manuales</strong> (conteo físico, daños, pérdidas). Para recibir mercancía de un proveedor usa el módulo de <strong>Compras</strong>.
              </p>
              <form onSubmit={submitMovement} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="md:col-span-2 lg:col-span-1">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Producto *</label>
                  <select
                    required
                    value={form.productId}
                    onChange={e => {
                      const p = products.find(p => p.id === e.target.value);
                      setForm({ ...form, productId: e.target.value, productName: p?.name ?? '', unitCost: p?.costPrice ? String(p.costPrice) : form.unitCost });
                    }}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">Seleccionar producto...</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Tipo</label>
                  <select
                    value={form.type}
                    onChange={e => setForm({ ...form, type: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="ADJUSTMENT">Ajuste (corrección)</option>
                    <option value="OUT">Salida (pérdida / daño)</option>
                    <option value="IN">Entrada (ajuste positivo)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Motivo</label>
                  <select
                    value={form.reason}
                    onChange={e => setForm({ ...form, reason: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  >
                    {REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Cantidad</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    placeholder="0"
                    value={form.quantity}
                    onChange={e => setForm({ ...form, quantity: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Costo Unitario</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={form.unitCost}
                    onChange={e => setForm({ ...form, unitCost: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Fecha</label>
                  <input
                    type="date"
                    value={form.movementDate}
                    onChange={e => setForm({ ...form, movementDate: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Referencia</label>
                  <input
                    placeholder="Nº orden / factura"
                    value={form.reference}
                    onChange={e => setForm({ ...form, reference: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Notas</label>
                  <input
                    placeholder="Notas adicionales"
                    value={form.notes}
                    onChange={e => setForm({ ...form, notes: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div className="md:col-span-2 lg:col-span-3 flex gap-3">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
                  >
                    {submitting ? 'Guardando...' : 'Registrar Movimiento'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowForm(false); setForm(emptyForm); }}
                    className="border border-slate-200 px-5 py-2 rounded-lg text-sm hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-4 py-3 text-slate-500 font-medium">Fecha</th>
                  <th className="text-left px-4 py-3 text-slate-500 font-medium">Producto</th>
                  {showBranchColumn && <th className="text-left px-4 py-3 text-slate-500 font-medium">Sucursal</th>}
                  <th className="text-center px-4 py-3 text-slate-500 font-medium">Tipo</th>
                  <th className="text-left px-4 py-3 text-slate-500 font-medium">Motivo</th>
                  <th className="text-right px-4 py-3 text-slate-500 font-medium">Cantidad</th>
                  <th className="text-right px-4 py-3 text-slate-500 font-medium">Costo Unit.</th>
                  <th className="text-left px-4 py-3 text-slate-500 font-medium">Referencia</th>
                </tr>
              </thead>
              <tbody>
                {movements.length === 0 && (
                  <tr><td colSpan={showBranchColumn ? 8 : 7} className="text-center py-8 text-slate-400">No hay movimientos registrados</td></tr>
                )}
                {movements.map(m => {
                  const tc = typeConfig[m.type] ?? { label: m.type, color: 'bg-slate-100 text-slate-600' };
                  return (
                    <tr key={m.id} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-500">{formatDate(m.date)}</td>
                      <td className="px-4 py-3 font-medium text-slate-700">{m.productName}</td>
                      {showBranchColumn && (
                        <td className="px-4 py-3 text-slate-500">
                          {m.branchName
                            ? <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full">{m.branchName}</span>
                            : <span className="text-slate-300">—</span>}
                        </td>
                      )}
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tc.color}`}>{tc.label}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{m.reason}</td>
                      <td className="px-4 py-3 text-right font-medium text-slate-700">{m.quantity}</td>
                      <td className="px-4 py-3 text-right text-slate-500">{formatCurrency(m.unitCost)}</td>
                      <td className="px-4 py-3 text-slate-400 font-mono text-xs">{m.reference || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
