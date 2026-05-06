'use client';
import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Plus, Trash2, Paperclip, Eye, X, FileText } from 'lucide-react';
import { BranchBadge } from '@/components/ui/branch-badge';
import { formatCurrency, formatDate } from '@/lib/utils';

interface Supplier { id: string; name: string; rnc: string; }
interface Product { id: string; name: string; costPrice?: number | null; itbisRate: number; }
interface PurchaseItem { productId?: string; description: string; quantity: number; unitCost: number; itbisRate: number; subtotal: number; itbisAmount: number; total: number; registerInCatalog?: boolean; salePrice?: string; minStock?: string; code?: string; barcode?: string; }
interface NewItemState { desc: string; qty: string; cost: string; itbis: string; productId: string; }
interface PurchaseDetail {
  id: string; supplierName: string; supplierRnc?: string; ncfNumber?: string; ncfType?: string;
  purchaseDate: string; subtotal: number; itbisTotal: number; total: number; status: string;
  isCredit: boolean; dueDate?: string; notes?: string; documentUrl?: string | null;
  items: { id: string; description: string; quantity: number; unitCost: number; itbisRate: number; subtotal: number; itbisAmount: number; total: number; }[];
}
interface Purchase { id: string; supplierName: string; ncfNumber?: string; purchaseDate: string; subtotal: number; itbisTotal: number; total: number; status: string; isCredit: boolean; documentUrl?: string | null; }

const statusLabel: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Borrador', color: 'bg-slate-100 text-slate-600' },
  CONFIRMED: { label: 'Confirmada', color: 'bg-green-100 text-green-700' },
  CANCELLED: { label: 'Cancelada', color: 'bg-red-100 text-red-700' },
};

interface NewSupplierForm { name: string; rnc: string; phone: string; email: string; }

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [ncfNumber, setNcfNumber] = useState('');
  const [ncfType, setNcfType] = useState('B11');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [isCredit, setIsCredit] = useState(false);
  const [dueDate, setDueDate] = useState('');
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [newItem, setNewItem] = useState<NewItemState>({ desc: '', qty: '1', cost: '', itbis: '18', productId: '' });
  const [pendingItem, setPendingItem] = useState<PurchaseItem | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docPreview, setDocPreview] = useState<string | null>(null);
  const [docUrl, setDocUrl] = useState('');
  const [viewDoc, setViewDoc] = useState<string | null>(null);
  const [viewPurchase, setViewPurchase] = useState<PurchaseDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const openDetail = async (id: string) => {
    setLoadingDetail(true);
    try {
      const r = await api.get(`/purchases/${id}`);
      setViewPurchase(r.data.data ?? r.data);
    } catch { toast.error('Error al cargar detalle'); }
    finally { setLoadingDetail(false); }
  };
  const [showNewSupplier, setShowNewSupplier] = useState(false);
  const [newSupplier, setNewSupplier] = useState<NewSupplierForm>({ name: '', rnc: '', phone: '', email: '' });
  const [savingSupplier, setSavingSupplier] = useState(false);

  const loadSuppliers = () => api.get('/suppliers').then(r => setSuppliers(r.data.data ?? [])).catch(() => {});

  const load = () => {
    api.get('/purchases').then(r => setPurchases(r.data.data ?? [])).catch(() => {});
    loadSuppliers();
  };
  useEffect(() => { load(); }, []);

  // Cargar productos del proveedor seleccionado (o todos si no hay proveedor)
  useEffect(() => {
    const url = supplierId ? `/products?supplierId=${supplierId}` : '/products';
    api.get(url).then(r => setProducts(r.data.data ?? [])).catch(() => {});
    // Limpiar item actual al cambiar proveedor
    setNewItem({ desc: '', qty: '1', cost: '', itbis: '18', productId: '' });
  }, [supplierId]);

  const saveNewSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSupplier(true);
    try {
      const r = await api.post('/suppliers', { name: newSupplier.name, rnc: newSupplier.rnc || undefined, phone: newSupplier.phone || undefined, email: newSupplier.email || undefined });
      const created = r.data.data ?? r.data;
      await loadSuppliers();
      setSupplierId(created.id);
      setShowNewSupplier(false);
      setNewSupplier({ name: '', rnc: '', phone: '', email: '' });
      toast.success('Proveedor creado');
    } catch { toast.error('Error al crear proveedor'); }
    finally { setSavingSupplier(false); }
  };

  const resetNewItem = () => setNewItem({ desc: '', qty: '1', cost: '', itbis: '18', productId: '' });

  const addItem = () => {
    if (!newItem.desc || !newItem.cost) return;
    const qty = parseFloat(newItem.qty) || 1;
    const cost = parseFloat(newItem.cost) || 0;
    const rate = parseFloat(newItem.itbis) || 0;
    const subtotal = qty * cost;
    const itbisAmount = subtotal * (rate / 100);
    const item: PurchaseItem = {
      productId: newItem.productId || undefined,
      description: newItem.desc,
      quantity: qty, unitCost: cost, itbisRate: rate,
      subtotal, itbisAmount, total: subtotal + itbisAmount,
    };

    // Si es producto nuevo (no del catálogo), preguntar si registrar
    if (!newItem.productId) {
      setPendingItem({ ...item, salePrice: '', minStock: '0', code: '', barcode: '' });
    } else {
      setItems(prev => [...prev, item]);
      resetNewItem();
    }
  };

  const confirmPendingItem = (registerInCatalog: boolean, salePrice?: string) => {
    if (!pendingItem) return;
    setItems(prev => [...prev, { ...pendingItem, registerInCatalog, salePrice }]);
    setPendingItem(null);
    resetNewItem();
  };

  const totals = items.reduce((acc, i) => ({ subtotal: acc.subtotal + i.subtotal, itbis: acc.itbis + i.itbisAmount, total: acc.total + i.total }), { subtotal: 0, itbis: 0, total: 0 });

  const handleDocSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('Máximo 10 MB'); return; }
    setDocFile(file);
    setDocPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) { toast.error('Agrega al menos un item'); return; }
    setLoading(true);
    const supplier = suppliers.find(s => s.id === supplierId);
    try {
      let finalDocUrl = docUrl;
      if (docFile) {
        const fd = new FormData();
        fd.append('file', docFile);
        const r = await api.post('/purchases/upload-document', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        finalDocUrl = r.data?.data?.url ?? r.data?.url ?? '';
      }
      // Registrar en catálogo los productos nuevos que se marcaron
      // Primero cargar productos existentes para evitar duplicados si el usuario reintenta
      const existingProducts: { id: string; name: string }[] = await api.get('/products')
        .then(r => r.data.data ?? []).catch(() => []);

      const itemsWithIds = await Promise.all(items.map(async i => {
        if (i.registerInCatalog && !i.productId && i.salePrice) {
          try {
            // Reusar producto existente si ya hay uno con el mismo nombre
            const existing = existingProducts.find(
              p => p.name.trim().toLowerCase() === i.description.trim().toLowerCase()
            );
            if (existing) return { ...i, productId: existing.id };

            const r = await api.post('/products', {
              name: i.description,
              price: parseFloat(i.salePrice),
              costPrice: i.unitCost,
              itbisRate: i.itbisRate,
              isService: false,
              minStock: parseInt(i.minStock ?? '0') || 0,
              code: i.code || undefined,
              barcode: i.barcode || undefined,
              supplierId: supplierId || undefined,
            });
            const p = r.data.data ?? r.data;
            return { ...i, productId: p.id };
          } catch { return i; }
        }
        return i;
      }));

      await api.post('/purchases', {
        supplierId: supplierId || undefined,
        supplierName: supplier?.name ?? 'Sin proveedor',
        supplierRnc: supplier?.rnc,
        ncfNumber, ncfType, purchaseDate, isCredit,
        dueDate: isCredit ? dueDate : undefined,
        documentUrl: finalDocUrl || undefined,
        items: itemsWithIds.map(i => ({ productId: i.productId, description: i.description, quantity: i.quantity, unitCost: i.unitCost, itbisRate: i.itbisRate })),
      });
      toast.success('Compra creada y stock actualizado');
      setShowForm(false); setItems([]); setDocFile(null); setDocPreview(null); setDocUrl('');
      load();
    } catch (err: any) { toast.error(err.response?.data?.message ?? 'Error'); }
    finally { setLoading(false); }
  };


  return (
    <div>
      <PageHeader title="Compras" description="Registro de compras a proveedores" action={
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"><Plus size={16} /> Nueva Compra</button>
      } />

      {showForm && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-700">Nueva Compra</h2>
            <BranchBadge />
          </div>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-12 gap-4 mb-4">
              {/* Proveedor — 5 columnas */}
              <div className="col-span-5">
                <label className="block text-sm font-medium text-slate-600 mb-1">Proveedor</label>
                <div className="flex gap-2">
                  <select className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm min-w-0" value={supplierId} onChange={e => setSupplierId(e.target.value)}>
                    <option value="">Sin proveedor / Compra informal</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <button type="button" onClick={() => setShowNewSupplier(true)} title="Agregar nuevo proveedor"
                    className="flex items-center justify-center w-9 h-9 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 hover:text-blue-600 flex-shrink-0">
                    <Plus size={15} />
                  </button>
                </div>
                {!supplierId && <p className="text-xs text-slate-400 mt-1">Compra en mercado, buhonero, colmado mayor, etc.</p>}
                {supplierId && products.length === 0 && <p className="text-xs text-amber-600 mt-1">Este proveedor no tiene productos asociados aún.</p>}
              </div>
              {/* NCF — 4 columnas */}
              <div className="col-span-4">
                <label className="block text-sm font-medium text-slate-600 mb-1">NCF del proveedor</label>
                <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={ncfNumber} onChange={e => setNcfNumber(e.target.value)} placeholder="B1100000001" />
              </div>
              {/* Fecha — 3 columnas */}
              <div className="col-span-3">
                <label className="block text-sm font-medium text-slate-600 mb-1">Fecha *</label>
                <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} required />
              </div>
              {/* Compra a crédito */}
              <div className="col-span-5 flex items-center gap-2">
                <input type="checkbox" id="isCredit" checked={isCredit} onChange={e => setIsCredit(e.target.checked)} className="w-4 h-4 accent-blue-600" />
                <label htmlFor="isCredit" className="text-sm text-slate-600 cursor-pointer">Compra a crédito</label>
              </div>
              {isCredit && (
                <div className="col-span-4">
                  <label className="block text-sm font-medium text-slate-600 mb-1">Fecha vencimiento</label>
                  <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                </div>
              )}
            </div>

            <h3 className="font-medium text-slate-600 mb-2 text-sm">Ítems</h3>
            <div className="bg-slate-50 rounded-lg p-3 mb-3 space-y-2">
              <div className="flex gap-2">
                <select
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
                  value={newItem.productId}
                  onChange={e => {
                    const pid = e.target.value;
                    const p = products.find(p => p.id === pid);
                    setNewItem({ ...newItem, productId: pid, desc: p?.name ?? '', cost: p?.costPrice ? String(p.costPrice) : newItem.cost, itbis: p ? String(p.itbisRate) : newItem.itbis });
                  }}
                >
                  <option value="">— Producto nuevo (escribir abajo) —</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <input className="flex-1 border rounded-lg px-3 py-2 text-sm" placeholder="Nombre / descripción *"
                  value={newItem.desc} onChange={e => setNewItem({ ...newItem, desc: e.target.value })} />
                <input type="number" className="w-20 border rounded-lg px-3 py-2 text-sm" placeholder="Cant."
                  value={newItem.qty} onChange={e => setNewItem({ ...newItem, qty: e.target.value })} min="0.01" step="0.01" />
                <input type="number" className="w-28 border rounded-lg px-3 py-2 text-sm" placeholder="Costo unit."
                  value={newItem.cost} onChange={e => setNewItem({ ...newItem, cost: e.target.value })} min="0" step="0.01" />
                <select className="w-24 border rounded-lg px-3 py-2 text-sm" value={newItem.itbis} onChange={e => setNewItem({ ...newItem, itbis: e.target.value })}>
                  <option value="18">18%</option>
                  <option value="16">16%</option>
                  <option value="0">Exento</option>
                </select>
                <button type="button" onClick={addItem} className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700"><Plus size={14} /></button>
              </div>
            </div>

            {/* Modal: Registrar en catálogo */}
            {pendingItem && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
                  <h3 className="font-semibold text-slate-800 mb-1">Registrar en catálogo</h3>
                  <p className="text-sm text-slate-500 mb-4">
                    <strong>"{pendingItem.description}"</strong> no está en tu catálogo.
                    Completa los datos para agregarlo y poder venderlo desde el POS.
                  </p>
                  <div className="space-y-3 mb-4">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Nombre *</label>
                      <input
                        value={pendingItem.description}
                        onChange={e => setPendingItem({ ...pendingItem, description: e.target.value })}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                        autoFocus
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Código/SKU</label>
                        <input
                          placeholder="Ej: PAN001"
                          value={pendingItem.code ?? ''}
                          onChange={e => setPendingItem({ ...pendingItem, code: e.target.value })}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Código de barras</label>
                        <input
                          placeholder="EAN-13, UPC..."
                          value={pendingItem.barcode ?? ''}
                          onChange={e => setPendingItem({ ...pendingItem, barcode: e.target.value })}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Precio de venta (RD$) *</label>
                        <input
                          type="number" step="0.01" min="0"
                          placeholder="Ej: 55.00"
                          value={pendingItem.salePrice ?? ''}
                          onChange={e => setPendingItem({ ...pendingItem, salePrice: e.target.value })}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                        />
                        <p className="text-xs text-slate-400 mt-1">Costo: RD${pendingItem.unitCost} · ITBIS: {pendingItem.itbisRate}%</p>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Stock mínimo (alerta)</label>
                        <input
                          type="number" min="0" step="1"
                          placeholder="Ej: 5"
                          value={pendingItem.minStock ?? '0'}
                          onChange={e => setPendingItem({ ...pendingItem, minStock: e.target.value })}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                        />
                        <p className="text-xs text-slate-400 mt-1">Avisa cuando el stock baje de este número</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => confirmPendingItem(true, pendingItem.salePrice)}
                      disabled={!pendingItem.salePrice}
                      className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-40"
                    >
                      Agregar al catálogo
                    </button>
                    <button
                      type="button"
                      onClick={() => confirmPendingItem(false)}
                      className="flex-1 border border-slate-200 py-2 rounded-lg text-sm hover:bg-slate-50"
                    >
                      Solo esta compra
                    </button>
                  </div>
                </div>
              </div>
            )}

            {items.length > 0 && (
              <table className="w-full text-sm mb-4 border-t">
                <thead className="bg-slate-50"><tr>
                  <th className="text-left px-3 py-2 text-slate-600">Descripción</th>
                  <th className="text-right px-3 py-2 text-slate-600">Cant.</th>
                  <th className="text-right px-3 py-2 text-slate-600">Costo</th>
                  <th className="text-right px-3 py-2 text-slate-600">ITBIS</th>
                  <th className="text-right px-3 py-2 text-slate-600">Total</th>
                  <th></th>
                </tr></thead>
                <tbody>
                  {items.map((item, i) => (
                    <tr key={i} className="border-t border-slate-50">
                      <td className="px-3 py-2">{item.description}</td>
                      <td className="px-3 py-2 text-right">{item.quantity}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(item.unitCost)}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(item.itbisAmount)}</td>
                      <td className="px-3 py-2 text-right font-medium">{formatCurrency(item.total)}</td>
                      <td className="px-3 py-2 text-right"><button type="button" onClick={() => setItems(items.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Document upload */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-600 mb-1">Factura del proveedor (foto/PDF)</label>
              {docPreview ? (
                <div className="flex items-center gap-3">
                  <img src={docPreview} alt="Doc" className="h-16 w-auto rounded border border-slate-200 object-contain bg-slate-50" />
                  <button type="button" onClick={() => { setDocFile(null); setDocPreview(null); }} className="text-red-400 hover:text-red-600"><X size={16} /></button>
                </div>
              ) : (
                <label className="flex items-center gap-2 cursor-pointer border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-lg px-4 py-2.5 text-sm text-slate-500 hover:text-blue-600 transition-colors w-fit">
                  <Paperclip size={15} /> Adjuntar factura (JPG, PNG, PDF — máx 10MB)
                  <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={handleDocSelect} className="hidden" />
                </label>
              )}
            </div>

            <div className="border-t pt-3 space-y-1 text-sm text-right mb-4">
              <div className="text-slate-500">Subtotal: <span className="font-medium text-slate-700">{formatCurrency(totals.subtotal)}</span></div>
              <div className="text-slate-500">ITBIS: <span className="font-medium text-slate-700">{formatCurrency(totals.itbis)}</span></div>
              <div className="font-bold text-slate-800">Total: {formatCurrency(totals.total)}</div>
            </div>

            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => { setShowForm(false); setItems([]); }} className="px-4 py-2 text-sm border rounded-lg hover:bg-slate-50">Cancelar</button>
              <button type="submit" disabled={loading} className="px-6 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{loading ? 'Guardando...' : 'Crear Compra'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Nuevo proveedor */}
      {showNewSupplier && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <form onSubmit={saveNewSupplier} className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-semibold text-slate-800 mb-4">Nuevo Proveedor</h3>
            <div className="space-y-3">
              <input required placeholder="Nombre *" value={newSupplier.name}
                onChange={e => setNewSupplier({ ...newSupplier, name: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" autoFocus />
              <input placeholder="RNC (opcional)" value={newSupplier.rnc}
                onChange={e => setNewSupplier({ ...newSupplier, rnc: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono" />
              <input placeholder="Teléfono (opcional)" value={newSupplier.phone}
                onChange={e => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              <input type="email" placeholder="Email (opcional)" value={newSupplier.email}
                onChange={e => setNewSupplier({ ...newSupplier, email: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="flex gap-2 mt-4">
              <button type="submit" disabled={savingSupplier}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                {savingSupplier ? 'Guardando...' : 'Crear Proveedor'}
              </button>
              <button type="button" onClick={() => setShowNewSupplier(false)}
                className="flex-1 border border-slate-200 py-2 rounded-lg text-sm hover:bg-slate-50">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-100"><tr>
            <th className="text-left px-4 py-3 text-slate-600 font-medium">Proveedor</th>
            <th className="text-left px-4 py-3 text-slate-600 font-medium">NCF</th>
            <th className="text-left px-4 py-3 text-slate-600 font-medium">Fecha</th>
            <th className="text-right px-4 py-3 text-slate-600 font-medium">Subtotal</th>
            <th className="text-right px-4 py-3 text-slate-600 font-medium">ITBIS</th>
            <th className="text-right px-4 py-3 text-slate-600 font-medium">Total</th>
            <th className="text-center px-4 py-3 text-slate-600 font-medium">Tipo</th>
            <th className="text-center px-4 py-3 text-slate-600 font-medium">Estado</th>
            <th className="text-right px-4 py-3 text-slate-600 font-medium">Acciones</th>
          </tr></thead>
          <tbody>
            {purchases.length === 0 && <tr><td colSpan={9} className="text-center py-8 text-slate-400">No hay compras registradas</td></tr>}
            {purchases.map(p => {
              const st = statusLabel[p.status] ?? { label: p.status, color: 'bg-slate-100 text-slate-600' };
              return (
                <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-700">{p.supplierName}</td>
                  <td className="px-4 py-3 font-mono text-slate-500 text-xs">{p.ncfNumber ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(p.purchaseDate)}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(p.subtotal)}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(p.itbisTotal)}</td>
                  <td className="px-4 py-3 text-right font-semibold">{formatCurrency(p.total)}</td>
                  <td className="px-4 py-3 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.isCredit ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>{p.isCredit ? 'Crédito' : 'Contado'}</span></td>
                  <td className="px-4 py-3 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>{st.label}</span></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {p.documentUrl && (
                        <button onClick={() => setViewDoc(p.documentUrl!)} title="Ver factura adjunta" className="text-slate-400 hover:text-blue-600"><Paperclip size={15} /></button>
                      )}
                      <button onClick={() => openDetail(p.id)} title="Ver detalle" disabled={loadingDetail} className="text-slate-400 hover:text-blue-600 disabled:opacity-40"><FileText size={15} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {/* Purchase detail modal */}
      {viewPurchase && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setViewPurchase(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-start justify-between p-6 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Compra #{viewPurchase.id.slice(-8).toUpperCase()}</h3>
                <p className="text-sm text-slate-500 mt-0.5">{viewPurchase.supplierName}{viewPurchase.supplierRnc ? ` · RNC ${viewPurchase.supplierRnc}` : ''}</p>
              </div>
              <button onClick={() => setViewPurchase(null)} className="text-slate-400 hover:text-slate-600 text-xl leading-none mt-1">✕</button>
            </div>

            {/* Meta info */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 px-6 py-4 bg-slate-50 border-b border-slate-100 text-sm">
              <div><p className="text-xs text-slate-400 mb-0.5">Fecha</p><p className="font-medium text-slate-700">{formatDate(viewPurchase.purchaseDate)}</p></div>
              <div><p className="text-xs text-slate-400 mb-0.5">NCF</p><p className="font-mono text-slate-700">{viewPurchase.ncfNumber || '—'}</p></div>
              <div><p className="text-xs text-slate-400 mb-0.5">Tipo NCF</p><p className="text-slate-700">{viewPurchase.ncfType || '—'}</p></div>
              <div><p className="text-xs text-slate-400 mb-0.5">Pago</p>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${viewPurchase.isCredit ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                  {viewPurchase.isCredit ? `Crédito${viewPurchase.dueDate ? ` · vence ${formatDate(viewPurchase.dueDate)}` : ''}` : 'Contado'}
                </span>
              </div>
            </div>

            {/* Items */}
            <div className="p-6">
              <table className="w-full text-sm mb-4">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-2 text-slate-500 font-medium">Descripción</th>
                    <th className="text-right py-2 text-slate-500 font-medium">Cant.</th>
                    <th className="text-right py-2 text-slate-500 font-medium">Costo Unit.</th>
                    <th className="text-right py-2 text-slate-500 font-medium">ITBIS</th>
                    <th className="text-right py-2 text-slate-500 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {viewPurchase.items?.map((item, i) => (
                    <tr key={i} className="border-b border-slate-50">
                      <td className="py-2.5 text-slate-700">{item.description}</td>
                      <td className="py-2.5 text-right text-slate-600">{item.quantity}</td>
                      <td className="py-2.5 text-right text-slate-600">{formatCurrency(item.unitCost)}</td>
                      <td className="py-2.5 text-right text-slate-500">{formatCurrency(item.itbisAmount)}</td>
                      <td className="py-2.5 text-right font-medium text-slate-700">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-56 space-y-1 text-sm">
                  <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>{formatCurrency(viewPurchase.subtotal)}</span></div>
                  <div className="flex justify-between text-slate-500"><span>ITBIS</span><span>{formatCurrency(viewPurchase.itbisTotal)}</span></div>
                  <div className="flex justify-between font-bold text-slate-800 border-t border-slate-200 pt-1 mt-1"><span>Total</span><span>{formatCurrency(viewPurchase.total)}</span></div>
                </div>
              </div>

              {viewPurchase.notes && (
                <p className="text-xs text-slate-400 mt-4 border-t border-slate-100 pt-3">Notas: {viewPurchase.notes}</p>
              )}

              {viewPurchase.documentUrl && (
                <div className="mt-4 border-t border-slate-100 pt-3">
                  <button onClick={() => { setViewPurchase(null); setViewDoc(viewPurchase.documentUrl!); }}
                    className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                    <Paperclip size={14} /> Ver factura adjunta del proveedor
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Document viewer modal */}
      {viewDoc && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setViewDoc(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-4 w-full max-w-2xl max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-800">Factura del Proveedor</h3>
              <div className="flex items-center gap-2">
                <a href={viewDoc} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline border border-blue-200 px-2 py-1 rounded"><Eye size={12} className="inline mr-1" />Abrir</a>
                <button onClick={() => setViewDoc(null)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">✕</button>
              </div>
            </div>
            {viewDoc.match(/\.(jpg|jpeg|png|gif|webp)$/i) || viewDoc.includes('/uploads/')
              ? <img src={viewDoc} alt="Factura" className="w-full rounded-lg border border-slate-100 object-contain max-h-[70vh]" />
              : <iframe src={viewDoc} className="w-full h-[70vh] rounded-lg border border-slate-100" />
            }
          </div>
        </div>
      )}
    </div>
  );
}
