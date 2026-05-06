'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { BranchBadge } from '@/components/ui/branch-badge';

interface Customer { id: string; name: string; rncCedula: string; }
interface Product { id: string; name: string; price: number; itbisRate: number; }
interface StockLevel { productId: string; currentStock: number; }

const NCF_TYPES = [
  { value: 'E32', label: 'E32 - Consumidor Final' },
  { value: 'E31', label: 'E31 - Crédito Fiscal' },
  { value: 'E33', label: 'E33 - Nota de Débito' },
  { value: 'E34', label: 'E34 - Nota de Crédito' },
  { value: 'E41', label: 'E41 - Comprobante de Compras' },
  { value: 'E43', label: 'E43 - Gastos Menores' },
  { value: 'E44', label: 'E44 - Régimen Especial' },
  { value: 'E45', label: 'E45 - Gubernamental' },
];

interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  itbisRate: number;
  subtotal: number;
  itbisAmount: number;
  total: number;
}

export default function NewSalePage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [stockLevels, setStockLevels] = useState<StockLevel[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [ncfType, setNcfType] = useState('E32');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<SaleItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [loading, setLoading] = useState(false);
  const [paymentSplits, setPaymentSplits] = useState<{ method: string; amount: string }[]>([
    { method: 'cash', amount: '' },
  ]);
  const addSplit = () => setPaymentSplits(s => [...s, { method: 'transfer', amount: '' }]);
  const removeSplit = (i: number) => setPaymentSplits(s => s.filter((_, idx) => idx !== i));
  const updateSplit = (i: number, field: 'method' | 'amount', val: string) =>
    setPaymentSplits(s => s.map((sp, idx) => idx === i ? { ...sp, [field]: val } : sp));

  useEffect(() => {
    api.get('/customers').then(r => setCustomers(r.data.data ?? []));
    api.get('/products').then(r => setProducts(r.data.data ?? []));
    api.get('/inventory/stock').then(r => setStockLevels(r.data.data ?? r.data ?? [])).catch(() => {});
  }, []);

  const getStock = (productId: string) => {
    const level = stockLevels.find(s => s.productId === productId);
    return level?.currentStock ?? null;
  };

  const addItem = () => {
    const product = products.find(p => p.id === selectedProduct);
    if (!product) return;
    const qty = parseFloat(quantity) || 1;
    const subtotal = product.price * qty;
    const itbisAmount = subtotal * (product.itbisRate / 100);
    setItems([...items, {
      productId: product.id,
      productName: product.name,
      quantity: qty,
      unitPrice: product.price,
      itbisRate: product.itbisRate,
      subtotal,
      itbisAmount,
      total: subtotal + itbisAmount,
    }]);
    setSelectedProduct('');
    setQuantity('1');
  };

  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));

  const totals = items.reduce((acc, item) => ({
    subtotal: acc.subtotal + item.subtotal,
    itbis: acc.itbis + item.itbisAmount,
    total: acc.total + item.total,
  }), { subtotal: 0, itbis: 0, total: 0 });

  const totalAssigned = paymentSplits.reduce((s, sp) => s + (parseFloat(sp.amount) || 0), 0);
  const isMixed = paymentSplits.length > 1;
  const primaryMethod = paymentSplits[0]?.method ?? 'cash';
  const cashSplit = paymentSplits.find(sp => sp.method === 'cash');
  const cashAmount = parseFloat(cashSplit?.amount || '0') || 0;
  const cambio = !isMixed && primaryMethod === 'cash' && cashAmount > totals.total
    ? cashAmount - totals.total
    : 0;
  const splitsValid = !isMixed || Math.abs(totalAssigned - totals.total) < 0.01;
  const isCredit = paymentSplits.some(sp => sp.method === 'credit');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) { toast.error('Agrega al menos un producto'); return; }
    if (isMixed && !splitsValid) { toast.error('Los montos de pago deben sumar exactamente el total'); return; }
    if (isCredit && !customerId) { toast.error('Selecciona un cliente para ventas a crédito (fiado)'); return; }
    setLoading(true);
    try {
      const customer = customers.find(c => c.id === customerId);
      const paymentMethod = isMixed
        ? (paymentSplits.every(sp => sp.method === primaryMethod) ? primaryMethod : 'mixed')
        : primaryMethod;
      const finalSplits = isMixed
        ? paymentSplits.map(sp => ({ method: sp.method, amount: parseFloat(sp.amount) || 0 }))
        : undefined;
      const created = await api.post('/sales', {
        customerId: customerId || undefined,
        customerName: customer?.name,
        customerRncCedula: customer?.rncCedula,
        ncfType,
        notes,
        saleDate: new Date().toISOString(),
        paymentMethod,
        paymentSplits: finalSplits,
        items: items.map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          itbisRate: item.itbisRate,
        })),
      });
      const saleId = created.data?.data?.id ?? created.data?.id;
      // Emitir inmediatamente para asignar NCF y descontar inventario
      await api.patch(`/sales/${saleId}/issue`);
      toast.success('Venta emitida — NCF asignado e inventario actualizado');
      router.push('/dashboard/sales');
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Error al crear venta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-2">
        <PageHeader title="Nueva Venta" description="Crear comprobante fiscal" />
        <BranchBadge className="mb-4" />
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
          <h2 className="font-semibold text-slate-700 mb-4">Datos del Comprobante</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Cliente</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm" value={customerId} onChange={e => setCustomerId(e.target.value)}>
                <option value="">Consumidor Final</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.rncCedula})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Tipo de NCF *</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm" value={ncfType} onChange={e => setNcfType(e.target.value)}>
                {NCF_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-600 mb-1">Notas</label>
              <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
          <h2 className="font-semibold text-slate-700 mb-4">Productos</h2>
          <div className="flex gap-3 mb-4">
            <div className="flex-1">
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={selectedProduct}
                onChange={e => setSelectedProduct(e.target.value)}
              >
                <option value="">Seleccionar producto del catálogo...</option>
                {products.map(p => {
                  const stock = getStock(p.id);
                  const outOfStock = stock !== null && stock <= 0;
                  return (
                    <option key={p.id} value={p.id} disabled={outOfStock}>
                      {p.name} — {formatCurrency(p.price)}{stock !== null ? ` (stock: ${stock})` : ''}
                      {outOfStock ? ' — SIN STOCK' : ''}
                    </option>
                  );
                })}
              </select>
              {selectedProduct && (() => {
                const stock = getStock(selectedProduct);
                if (stock !== null && stock <= 5 && stock > 0) return (
                  <p className="text-xs text-amber-600 mt-1">Stock bajo: quedan {stock} unidades</p>
                );
                if (stock !== null && stock <= 0) return (
                  <p className="text-xs text-red-600 mt-1">Sin stock disponible</p>
                );
                return null;
              })()}
            </div>
            <input type="number" min="1" step="1" className="w-24 border rounded-lg px-3 py-2 text-sm" placeholder="Cant." value={quantity} onChange={e => setQuantity(e.target.value)} />
            <button type="button" onClick={addItem} disabled={!selectedProduct} className="flex items-center gap-2 bg-slate-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-slate-800 disabled:opacity-40">
              <Plus size={16} /> Agregar
            </button>
          </div>

          {items.length > 0 && (
            <table className="w-full text-sm mb-4">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-3 py-2 text-slate-600">Producto</th>
                  <th className="text-right px-3 py-2 text-slate-600">Cant.</th>
                  <th className="text-right px-3 py-2 text-slate-600">Precio</th>
                  <th className="text-right px-3 py-2 text-slate-600">ITBIS</th>
                  <th className="text-right px-3 py-2 text-slate-600">Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i} className="border-t border-slate-50">
                    <td className="px-3 py-2">{item.productName}</td>
                    <td className="px-3 py-2 text-right">{item.quantity}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(item.unitPrice)}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(item.itbisAmount)}</td>
                    <td className="px-3 py-2 text-right font-medium">{formatCurrency(item.total)}</td>
                    <td className="px-3 py-2 text-right"><button type="button" onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="border-t border-slate-100 pt-4 space-y-1 text-sm">
            <div className="flex justify-between text-slate-600"><span>Subtotal:</span><span>{formatCurrency(totals.subtotal)}</span></div>
            <div className="flex justify-between text-slate-600"><span>ITBIS (18%):</span><span>{formatCurrency(totals.itbis)}</span></div>
            <div className="flex justify-between font-bold text-slate-800 text-base"><span>Total:</span><span>{formatCurrency(totals.total)}</span></div>
          </div>
        </div>

        {/* ── Método de Pago ─────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
          <h2 className="font-semibold text-slate-700 mb-4">Método de Pago</h2>
          <div className="space-y-3">
            {paymentSplits.map((sp, i) => (
              <div key={i} className="flex gap-3 items-center">
                <select
                  value={sp.method}
                  onChange={e => updateSplit(i, 'method', e.target.value)}
                  className="border rounded-lg px-3 py-2 text-sm w-48"
                >
                  <option value="cash">Efectivo</option>
                  <option value="card">Tarjeta</option>
                  <option value="transfer">Transferencia</option>
                  <option value="check">Cheque</option>
                  {customerId && <option value="credit">Fiado / Crédito</option>}
                </select>
                <input
                  type="number" step="0.01" min="0"
                  placeholder={isMixed ? `Monto (restante: ${(totals.total - totalAssigned + (parseFloat(sp.amount)||0)).toFixed(2)})` : 'Monto recibido (opcional)'}
                  value={sp.amount}
                  onChange={e => updateSplit(i, 'amount', e.target.value)}
                  className="border rounded-lg px-3 py-2 text-sm w-44"
                />
                {paymentSplits.length > 1 && (
                  <button type="button" onClick={() => removeSplit(i)} className="text-red-400 hover:text-red-600">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
            {!isCredit && paymentSplits.length < 3 && (
              <button type="button" onClick={addSplit} className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
                <Plus size={14} /> Agregar otro método de pago
              </button>
            )}
          </div>

          {isMixed && (
            <div className="mt-3 pt-3 border-t border-slate-100 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Total asignado:</span>
                <span className={splitsValid ? 'text-green-600 font-medium' : 'text-amber-600 font-medium'}>
                  {formatCurrency(totalAssigned)} / {formatCurrency(totals.total)}
                </span>
              </div>
              {!splitsValid && (
                <p className="text-xs text-amber-600 mt-1">Los montos deben sumar exactamente {formatCurrency(totals.total)}</p>
              )}
            </div>
          )}

          {cambio > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between text-lg font-bold text-green-700">
              <span>Cambio:</span><span>{formatCurrency(cambio)}</span>
            </div>
          )}

          {isCredit && !customerId && (
            <p className="text-xs text-red-600 mt-2">⚠ Selecciona un cliente para ventas a crédito (fiado)</p>
          )}
        </div>

        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => router.back()} className="px-4 py-2 text-sm border rounded-lg hover:bg-slate-50">Cancelar</button>
          <button type="submit" disabled={loading || (isMixed && !splitsValid) || (isCredit && !customerId)} className="px-6 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Emitiendo...' : 'Emitir Venta'}
          </button>
        </div>
      </form>
    </div>
  );
}
