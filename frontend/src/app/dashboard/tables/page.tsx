'use client';
import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Plus, Users, Trash2, X, ChevronRight } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useConfirm } from '@/components/ui/confirm-dialog';

interface Table { id: string; name: string; capacity: number; status: string; currentOrderId?: string; currentOrder?: TableOrder | null; notes?: string; }
interface TableOrderItem { productName: string; quantity: number; unitPrice: number; itbisRate: number; subtotal: number; itbisAmount: number; total: number; notes?: string; }
interface TableOrder { id: string; tableId: string; tableName: string; serverName?: string; items: TableOrderItem[]; subtotal: number; itbisTotal: number; tipAmount: number; total: number; guestCount: number; status: string; openedAt: string; }

const TABLE_COLORS: Record<string, string> = {
  AVAILABLE: 'bg-green-50 border-green-200 hover:bg-green-100',
  OCCUPIED:  'bg-amber-50 border-amber-300',
  RESERVED:  'bg-blue-50 border-blue-200',
};
const TABLE_LABEL: Record<string, string> = { AVAILABLE: 'Disponible', OCCUPIED: 'Ocupada', RESERVED: 'Reservada' };

const METHODS = [{ v: 'cash', l: 'Efectivo' }, { v: 'card', l: 'Tarjeta' }, { v: 'transfer', l: 'Transferencia' }, { v: 'mixed', l: 'Mixto' }];

export default function TablesPage() {
  const confirm = useConfirm();
  const [tables, setTables] = useState<Table[]>([]);
  const [activeOrder, setActiveOrder] = useState<TableOrder | null>(null);
  const [activeTable, setActiveTable] = useState<Table | null>(null);
  const [view, setView] = useState<'map' | 'order'>('map');
  const [showNewTable, setShowNewTable] = useState(false);
  const [newTableForm, setNewTableForm] = useState({ name: '', capacity: '4' });
  const [itemForm, setItemForm] = useState({ productName: '', quantity: '1', unitPrice: '', itbisRate: '18' });
  const [payMethod, setPayMethod] = useState('cash');
  const [tipPct, setTipPct] = useState('');
  const [tipAmt, setTipAmt] = useState('');
  const [paying, setPaying] = useState(false);

  const load = () => api.get('/restaurant-tables/tables').then(r => setTables(r.data.data ?? [])).catch(() => {});
  useEffect(() => { load(); }, []);

  const openTable = async (table: Table) => {
    if (table.status === 'AVAILABLE') {
      try {
        const r = await api.post('/restaurant-tables/orders/open', { tableId: table.id, guestCount: 1 });
        const order = r.data.data ?? r.data;
        setActiveOrder(order); setActiveTable(table); setView('order');
        load();
      } catch (err: any) { toast.error(err.response?.data?.message ?? 'Error'); }
    } else if (table.currentOrder) {
      setActiveOrder(table.currentOrder); setActiveTable(table); setView('order');
    }
  };

  const refreshOrder = async (orderId: string) => {
    const r = await api.get(`/restaurant-tables/orders/${orderId}`).catch(() => null);
    if (r) setActiveOrder(r.data.data ?? r.data);
  };

  const addItem = async () => {
    if (!activeOrder || !itemForm.productName || !itemForm.unitPrice) return;
    try {
      await api.post(`/restaurant-tables/orders/${activeOrder.id}/items`, {
        productName: itemForm.productName,
        quantity: parseFloat(itemForm.quantity) || 1,
        unitPrice: parseFloat(itemForm.unitPrice) || 0,
        itbisRate: parseInt(itemForm.itbisRate) || 18,
      });
      setItemForm({ productName: '', quantity: '1', unitPrice: '', itbisRate: '18' });
      await refreshOrder(activeOrder.id); load();
    } catch { toast.error('Error al agregar ítem'); }
  };

  const removeItem = async (idx: number) => {
    if (!activeOrder) return;
    await api.delete(`/restaurant-tables/orders/${activeOrder.id}/items/${idx}`);
    await refreshOrder(activeOrder.id); load();
  };

  const applyTip = async () => {
    if (!activeOrder) return;
    let amt = parseFloat(tipAmt) || 0;
    if (tipPct && !tipAmt) amt = Math.round(Number(activeOrder.subtotal) * (parseFloat(tipPct) / 100) * 100) / 100;
    await api.patch(`/restaurant-tables/orders/${activeOrder.id}/tip`, { tipAmount: amt });
    await refreshOrder(activeOrder.id);
  };

  const closeOrder = async () => {
    if (!activeOrder) return;
    if (!await confirm({ title: 'Cobrar mesa', message: `¿Cobrar ${formatCurrency(activeOrder.total)} con ${METHODS.find(m => m.v === payMethod)?.l}?`, confirmText: 'Cobrar' })) return;
    setPaying(true);
    try {
      await api.post(`/restaurant-tables/orders/${activeOrder.id}/close`, {
        paymentMethod: payMethod,
        tipAmount: activeOrder.tipAmount,
      });
      toast.success('Mesa cobrada ✓');
      setView('map'); setActiveOrder(null); setActiveTable(null);
      load();
    } catch (err: any) { toast.error(err.response?.data?.message ?? 'Error'); }
    finally { setPaying(false); }
  };

  const cancelOrder = async () => {
    if (!activeOrder) return;
    if (!await confirm({ title: 'Cancelar orden', message: '¿Cancelar la orden y liberar la mesa?', confirmText: 'Cancelar orden' })) return;
    await api.post(`/restaurant-tables/orders/${activeOrder.id}/cancel`);
    toast.success('Orden cancelada'); setView('map'); setActiveOrder(null); setActiveTable(null); load();
  };

  const createTable = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/restaurant-tables/tables', { name: newTableForm.name, capacity: parseInt(newTableForm.capacity) });
      toast.success('Mesa creada'); setShowNewTable(false); setNewTableForm({ name: '', capacity: '4' }); load();
    } catch { toast.error('Error'); }
  };

  const deleteTable = async (id: string) => {
    if (!await confirm({ title: 'Eliminar mesa', message: '¿Eliminar esta mesa?', confirmText: 'Eliminar' })) return;
    try { await api.delete(`/restaurant-tables/tables/${id}`); toast.success('Mesa eliminada'); load(); }
    catch { toast.error('Error'); }
  };

  // ─── ORDER VIEW ──────────────────────────────────────────────────────────────
  if (view === 'order' && activeOrder && activeTable) {
    const tipValue = parseFloat(tipAmt) || (tipPct ? Math.round(Number(activeOrder.subtotal) * parseFloat(tipPct) / 100 * 100) / 100 : Number(activeOrder.tipAmount));
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => { setView('map'); load(); }} className="text-slate-400 hover:text-slate-600">
            <ChevronRight size={20} className="rotate-180" />
          </button>
          <h1 className="text-xl font-bold text-slate-800">{activeTable.name}</h1>
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${TABLE_COLORS[activeTable.status] ?? ''} border`}>{TABLE_LABEL[activeTable.status]}</span>
          <span className="text-sm text-slate-400"><Users size={13} className="inline mr-1" />{activeOrder.guestCount} persona(s)</span>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 mb-4">
          <h2 className="text-sm font-semibold text-slate-600 mb-3">Agregar ítem</h2>
          <div className="flex gap-2">
            <input placeholder="Producto / Plato *" value={itemForm.productName}
              onChange={e => setItemForm({ ...itemForm, productName: e.target.value })}
              className="flex-1 border rounded-lg px-3 py-2 text-sm" />
            <input type="number" min="1" step="0.5" placeholder="Cant." value={itemForm.quantity}
              onChange={e => setItemForm({ ...itemForm, quantity: e.target.value })}
              className="w-20 border rounded-lg px-3 py-2 text-sm" />
            <input type="number" step="0.01" placeholder="Precio" value={itemForm.unitPrice}
              onChange={e => setItemForm({ ...itemForm, unitPrice: e.target.value })}
              className="w-28 border rounded-lg px-3 py-2 text-sm" />
            <select value={itemForm.itbisRate} onChange={e => setItemForm({ ...itemForm, itbisRate: e.target.value })}
              className="w-28 border rounded-lg px-3 py-2 text-sm">
              <option value="18">ITBIS 18%</option>
              <option value="16">ITBIS 16%</option>
              <option value="0">Exento</option>
            </select>
            <button onClick={addItem} className="bg-blue-600 text-white px-4 rounded-lg text-sm hover:bg-blue-700">+ Agregar</button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 shadow-sm mb-4 overflow-hidden">
          {activeOrder.items.length === 0 ? (
            <p className="text-center py-8 text-slate-400 text-sm">La orden está vacía — agrega ítems arriba</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-4 py-2.5 text-slate-500 font-medium">Ítem</th>
                  <th className="text-center px-4 py-2.5 text-slate-500 font-medium">Cant.</th>
                  <th className="text-right px-4 py-2.5 text-slate-500 font-medium">Precio</th>
                  <th className="text-right px-4 py-2.5 text-slate-500 font-medium">ITBIS</th>
                  <th className="text-right px-4 py-2.5 text-slate-500 font-medium">Total</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {activeOrder.items.map((it, i) => (
                  <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-4 py-2.5">{it.productName}{it.notes && <span className="text-xs text-slate-400 ml-1">({it.notes})</span>}</td>
                    <td className="px-4 py-2.5 text-center">{it.quantity}</td>
                    <td className="px-4 py-2.5 text-right">{formatCurrency(it.unitPrice)}</td>
                    <td className="px-4 py-2.5 text-right text-slate-500">{formatCurrency(it.itbisAmount)}</td>
                    <td className="px-4 py-2.5 text-right font-medium">{formatCurrency(it.total)}</td>
                    <td className="px-3 py-2.5 text-right">
                      <button onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600"><Trash2 size={13} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Propina */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 mb-4">
          <h2 className="text-sm font-semibold text-slate-600 mb-3">Propina</h2>
          <div className="flex gap-2 items-center">
            <div className="flex gap-1">
              {['10','15','18'].map(p => (
                <button key={p} onClick={() => { setTipPct(p); setTipAmt(''); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${tipPct === p && !tipAmt ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{p}%</button>
              ))}
            </div>
            <span className="text-slate-400 text-sm">o</span>
            <input type="number" step="0.01" placeholder="Monto fijo (RD$)" value={tipAmt}
              onChange={e => { setTipAmt(e.target.value); setTipPct(''); }}
              className="border rounded-lg px-3 py-1.5 text-sm w-40" />
            <button onClick={applyTip} className="text-xs bg-slate-700 text-white px-3 py-1.5 rounded-lg hover:bg-slate-800">Aplicar</button>
            {Number(activeOrder.tipAmount) > 0 && (
              <span className="text-sm text-green-700 font-medium">Propina: {formatCurrency(activeOrder.tipAmount)}</span>
            )}
          </div>
        </div>

        {/* Totales + Cobro */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <div className="space-y-1.5 text-sm mb-4">
            <div className="flex justify-between text-slate-600"><span>Subtotal:</span><span>{formatCurrency(activeOrder.subtotal)}</span></div>
            <div className="flex justify-between text-slate-600"><span>ITBIS:</span><span>{formatCurrency(activeOrder.itbisTotal)}</span></div>
            {Number(activeOrder.tipAmount) > 0 && <div className="flex justify-between text-green-700"><span>Propina:</span><span>{formatCurrency(activeOrder.tipAmount)}</span></div>}
            <div className="flex justify-between font-bold text-xl text-slate-800 pt-2 border-t border-slate-100">
              <span>TOTAL</span><span>{formatCurrency(activeOrder.total)}</span>
            </div>
          </div>

          <div className="flex gap-2 mb-3">
            {METHODS.map(m => (
              <button key={m.v} onClick={() => setPayMethod(m.v)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border ${payMethod === m.v ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{m.l}</button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={closeOrder} disabled={paying || activeOrder.items.length === 0}
              className="flex-1 bg-green-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-green-700 disabled:opacity-50">
              {paying ? 'Procesando...' : `Cobrar ${formatCurrency(activeOrder.total)}`}
            </button>
            <button onClick={cancelOrder} className="border border-red-200 text-red-500 px-4 py-3 rounded-xl text-sm hover:bg-red-50">
              <X size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── MAP VIEW ────────────────────────────────────────────────────────────────
  return (
    <div>
      <PageHeader title="Mesas" description="Gestión de mesas para restaurantes y cafeterías"
        action={<button onClick={() => setShowNewTable(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"><Plus size={16} /> Nueva Mesa</button>}
      />

      {showNewTable && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <form onSubmit={createTable} className="bg-white rounded-xl p-6 w-80 shadow-xl">
            <h2 className="text-lg font-semibold mb-4">Nueva Mesa</h2>
            <div className="space-y-3">
              <input required placeholder="Nombre (Mesa 1, Barra, Terraza...)" value={newTableForm.name}
                onChange={e => setNewTableForm({ ...newTableForm, name: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
              <div>
                <label className="block text-xs text-slate-500 mb-1">Capacidad (personas)</label>
                <input type="number" min="1" max="30" value={newTableForm.capacity}
                  onChange={e => setNewTableForm({ ...newTableForm, capacity: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm">Crear</button>
              <button type="button" onClick={() => setShowNewTable(false)} className="flex-1 border py-2 rounded-lg text-sm">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* Leyenda */}
      <div className="flex gap-4 mb-5 text-sm">
        {Object.entries(TABLE_LABEL).map(([k, v]) => (
          <div key={k} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded-full border ${k === 'AVAILABLE' ? 'bg-green-200 border-green-400' : k === 'OCCUPIED' ? 'bg-amber-200 border-amber-400' : 'bg-blue-200 border-blue-400'}`} />
            <span className="text-slate-600">{v}</span>
          </div>
        ))}
        <span className="text-slate-400 text-xs">— Toca una mesa para abrir/gestionar la orden</span>
      </div>

      {/* Map grid */}
      {tables.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-12 text-center text-slate-400">
          <div className="text-4xl mb-3">🍽️</div>
          <p className="font-medium">No hay mesas configuradas</p>
          <p className="text-sm mt-1">Crea tu primera mesa para comenzar</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {tables.map(t => {
            const order = t.currentOrder;
            return (
              <div key={t.id}
                onClick={() => openTable(t)}
                className={`relative border-2 rounded-2xl p-4 cursor-pointer transition-all ${TABLE_COLORS[t.status] ?? 'bg-white border-slate-200'} ${t.status === 'AVAILABLE' ? 'hover:shadow-md' : 'shadow-md'}`}
              >
                <button
                  onClick={e => { e.stopPropagation(); deleteTable(t.id); }}
                  className="absolute top-2 right-2 text-slate-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                >
                  <X size={12} />
                </button>
                <div className="text-center">
                  <div className="text-3xl mb-1">🪑</div>
                  <p className="font-bold text-slate-800 text-sm">{t.name}</p>
                  <p className="text-xs text-slate-400"><Users size={10} className="inline mr-0.5" />{t.capacity}</p>
                  <p className={`text-xs font-medium mt-1 ${t.status === 'AVAILABLE' ? 'text-green-600' : t.status === 'OCCUPIED' ? 'text-amber-700' : 'text-blue-600'}`}>
                    {TABLE_LABEL[t.status]}
                  </p>
                  {order && (
                    <div className="mt-2 pt-2 border-t border-amber-200">
                      <p className="text-xs font-bold text-amber-800">{formatCurrency(order.total)}</p>
                      <p className="text-xs text-amber-600">{order.items.length} ítem(s)</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
