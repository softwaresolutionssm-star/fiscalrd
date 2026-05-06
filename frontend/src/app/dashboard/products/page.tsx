'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Pencil, Trash2, Search, Upload, Download } from 'lucide-react';
import { BranchBadge } from '@/components/ui/branch-badge';
import { useAuth } from '@/contexts/auth-context';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { formatCurrency } from '@/lib/utils';
import { CsvImportModal } from '@/components/ui/csv-import-modal';

interface Product {
  id: string;
  name: string;
  code?: string;
  barcode?: string;
  price: number;
  costPrice?: number | null;
  itbisRate: number;
  isService: boolean;
  isActive: boolean;
  minStock?: number;
}

export default function ProductsPage() {
  const confirm = useConfirm();
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({ name: '', code: '', barcode: '', price: '', costPrice: '', itbisRate: '18', isService: 'false' as string, minStock: '0' });

  const load = () => api.get('/products').then(r => setProducts(r.data.data ?? [])).catch(() => null);
  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    try {
      const payload: any = {
        ...form,
        price: parseFloat(form.price),
        itbisRate: parseInt(form.itbisRate),
        costPrice: form.costPrice ? parseFloat(form.costPrice) : null,
        isService: form.isService === 'true',
      };
      if (form.isService === 'false') payload.minStock = parseInt(form.minStock) || 0;
      await api.patch(`/products/${editing.id}`, payload);
      toast.success('Producto actualizado');
      setEditing(null);
      load();
    } catch {
      toast.error('Error al guardar producto');
    }
  };

  const remove = async (id: string) => {
    if (!await confirm({ title: 'Eliminar producto', message: '¿Estás seguro de que deseas eliminar este producto?', confirmText: 'Eliminar' })) return;
    try {
      await api.delete(`/products/${id}`);
      toast.success('Producto eliminado');
      load();
    } catch {
      toast.error('Error al eliminar');
    }
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({ name: p.name, code: p.code ?? '', barcode: p.barcode ?? '', price: String(p.price), costPrice: p.costPrice != null ? String(p.costPrice) : '', itbisRate: String(p.itbisRate), isService: String(p.isService), minStock: String(p.minStock ?? 0) });
  };

  const filtered = products.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  );

  // ── Bulk selection ──────────────────────────────────────────────────────────
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const allSelected = filtered.length > 0 && filtered.every(p => selected.has(p.id));
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(filtered.map(p => p.id)));
  const toggle = (id: string) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const bulkDelete = async () => {
    if (!await confirm({ title: 'Eliminar productos', message: `¿Eliminar ${selected.size} producto(s) seleccionado(s)? Esta acción no se puede deshacer.`, confirmText: 'Eliminar' })) return;
    const ids = Array.from(selected);
    let ok = 0;
    for (const id of ids) {
      try { await api.delete(`/products/${id}`); ok++; } catch { /* skip */ }
    }
    toast.success(`${ok} producto(s) eliminado(s)`);
    setSelected(new Set());
    load();
  };

  const exportCsv = () => {
    const rows = (selected.size > 0 ? filtered.filter(p => selected.has(p.id)) : filtered);
    const header = 'Nombre,Código,Precio,ITBIS%,Tipo,StockMínimo';
    const lines = rows.map(p => `"${p.name}","${p.code ?? ''}",${p.price},${p.itbisRate},"${p.isService ? 'Servicio' : 'Producto'}",${p.minStock ?? 0}`);
    const csv = [header, ...lines].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'productos.csv';
    a.click();
  };

  return (
    <div>
      <PageHeader
        title="Productos y Servicios"
        description="Los productos se agregan desde Compras al registrar una nueva compra"
        action={
          <div className="flex gap-2">
            <button onClick={() => setShowImport(true)}
              className="flex items-center gap-2 border border-slate-200 bg-white text-slate-600 px-4 py-2 rounded-lg text-sm hover:bg-slate-50">
              <Upload size={15} /> Importar CSV
            </button>
          </div>
        }
      />

      {/* Banner informativo para admins de sucursal */}
      {user?.branchId && (
        <div className="mb-4 flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl px-4 py-3 text-sm">
          <span className="text-blue-500">ℹ</span>
          <span>El catálogo de productos es <strong>compartido entre todas las sucursales</strong>. El stock por sucursal se gestiona desde <a href="/dashboard/inventory" className="underline font-semibold">Inventario</a>.</span>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <form onSubmit={save} className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{editing ? 'Editar' : 'Nuevo'} Producto</h2>
              <BranchBadge mode="global" />
            </div>
            <div className="space-y-3">
              <input required placeholder="Nombre *" value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              <input placeholder="Código/SKU" value={form.code} onChange={e => setForm({...form, code: e.target.value})}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              <input placeholder="Código de barras (EAN-13, UPC...)" value={form.barcode} onChange={e => setForm({...form, barcode: e.target.value})}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono" />
              <input required type="number" step="0.01" placeholder="Precio de venta *" value={form.price} onChange={e => setForm({...form, price: e.target.value})}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              <input type="number" step="0.01" min="0" placeholder="Costo (para COGS en contabilidad)"
                value={form.costPrice} onChange={e => setForm({...form, costPrice: e.target.value})}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              <select value={form.itbisRate} onChange={e => setForm({...form, itbisRate: e.target.value})}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                <option value="18">ITBIS 18%</option>
                <option value="16">ITBIS 16%</option>
                <option value="0">Exento</option>
              </select>
              {form.isService === 'false' && (
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Stock mínimo (alerta)</label>
                  <input type="number" min="0" step="1" placeholder="0"
                    value={form.minStock} onChange={e => setForm({...form, minStock: e.target.value})}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                </div>
              )}
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={form.isService === 'true'} onChange={e => setForm({...form, isService: String(e.target.checked)})} />
                Es un servicio
              </label>
            </div>
            <div className="flex gap-2 mt-4">
              <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700">Guardar</button>
              <button type="button" onClick={() => setEditing(null)} className="flex-1 border border-slate-200 py-2 rounded-lg text-sm hover:bg-slate-50">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* Search + bulk bar */}
      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Buscar por nombre..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
        </div>
        <button onClick={exportCsv} className="flex items-center gap-1.5 border border-slate-200 bg-white text-slate-600 px-3 py-2 rounded-lg text-sm hover:bg-slate-50">
          <Download size={14} /> Exportar{selected.size > 0 ? ` (${selected.size})` : ''}
        </button>
        {selected.size > 0 && (
          <button onClick={bulkDelete} className="flex items-center gap-1.5 bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-lg text-sm hover:bg-red-100">
            <Trash2 size={14} /> Eliminar ({selected.size})
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-4 py-3 w-8">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} className="rounded" />
              </th>
              <th className="text-left px-4 py-3 text-slate-500 font-medium">Nombre</th>
              <th className="text-left px-4 py-3 text-slate-500 font-medium">Código</th>
              <th className="text-left px-4 py-3 text-slate-500 font-medium">Precio</th>
              <th className="text-left px-4 py-3 text-slate-500 font-medium">ITBIS</th>
              <th className="text-left px-4 py-3 text-slate-500 font-medium">Tipo</th>
              <th className="text-right px-4 py-3 text-slate-500 font-medium">Stock Mín.</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="text-center py-8 text-slate-400">
                {products.length === 0 ? 'No hay productos — agrégalos desde Compras' : 'No se encontraron resultados'}
              </td></tr>
            )}
            {filtered.map(p => (
              <tr key={p.id} className={`border-b border-slate-50 hover:bg-slate-50 ${selected.has(p.id) ? 'bg-blue-50/50' : ''}`}>
                <td className="px-4 py-3">
                  <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} className="rounded" />
                </td>
                <td className="px-4 py-3 font-medium">{p.name}</td>
                <td className="px-4 py-3 text-slate-500">{p.code || '-'}</td>
                <td className="px-4 py-3">{formatCurrency(p.price)}</td>
                <td className="px-4 py-3">{p.itbisRate === 0 ? 'Exento' : `${p.itbisRate}%`}</td>
                <td className="px-4 py-3 text-slate-500">{p.isService ? 'Servicio' : 'Producto'}</td>
                <td className="px-4 py-3 text-right text-slate-500">
                  {p.isService ? '—' : (p.minStock != null ? p.minStock : '—')}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => openEdit(p)} className="text-slate-400 hover:text-blue-600"><Pencil size={15} /></button>
                    <button onClick={() => remove(p.id)} className="text-slate-400 hover:text-red-600"><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showImport && (
        <CsvImportModal
          title="Productos"
          endpoint="/products/import/csv"
          templateHeaders="Nombre,Precio,ITBIS%,Código,Código de Barras,Stock Mínimo"
          templateExample="Aceite Vegetal 1L,150,18,ACE001,,5"
          onSuccess={load}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  );
}
