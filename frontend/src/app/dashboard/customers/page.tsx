'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Search, Upload, Download } from 'lucide-react';
import { BranchBadge } from '@/components/ui/branch-badge';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { CsvImportModal } from '@/components/ui/csv-import-modal';

interface Customer {
  id: string;
  name: string;
  type: string;
  cedula?: string;
  rnc?: string;
  email?: string;
  phone?: string;
  creditLimit?: number;
}

export default function CustomersPage() {
  const confirm = useConfirm();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState({ name: '', type: 'individual', cedula: '', rnc: '', email: '', phone: '', creditLimit: '' });

  const load = () => api.get('/customers').then(r => setCustomers(r.data.data ?? [])).catch(() => null);

  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = { name: form.name, type: form.type };
    if (form.email) payload.email = form.email;
    if (form.phone) payload.phone = form.phone;
    if (form.type === 'individual' && form.cedula) payload.cedula = form.cedula;
    if (form.type === 'business' && form.rnc) payload.rnc = form.rnc;
    if (form.creditLimit !== undefined) payload.creditLimit = parseFloat(form.creditLimit) || 0;
    try {
      if (editing) {
        await api.patch(`/customers/${editing.id}`, payload);
        toast.success('Cliente actualizado');
      } else {
        await api.post('/customers', payload);
        toast.success('Cliente creado');
      }
      setShowForm(false);
      setEditing(null);
      setForm({ name: '', type: 'individual', cedula: '', rnc: '', email: '', phone: '', creditLimit: '' });
      load();
    } catch {
      toast.error('Error al guardar cliente');
    }
  };

  const remove = async (id: string) => {
    if (!await confirm({ title: 'Eliminar cliente', message: '¿Estás seguro de que deseas eliminar este cliente?', confirmText: 'Eliminar' })) return;
    try {
      await api.delete(`/customers/${id}`);
      toast.success('Cliente eliminado');
      load();
    } catch {
      toast.error('Error al eliminar');
    }
  };

  const openEdit = (c: Customer) => {
    setEditing(c);
    setForm({ name: c.name, type: c.type, cedula: c.cedula ?? '', rnc: c.rnc ?? '', email: c.email ?? '', phone: c.phone ?? '', creditLimit: String(c.creditLimit ?? 0) });
    setShowForm(true);
  };

  const filtered = customers.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase())
  );

  // ── Bulk selection ──────────────────────────────────────────────────────────
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const allSelected = filtered.length > 0 && filtered.every(c => selected.has(c.id));
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(filtered.map(c => c.id)));
  const toggle = (id: string) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const bulkDelete = async () => {
    if (!await confirm({ title: 'Eliminar clientes', message: `¿Eliminar ${selected.size} cliente(s) seleccionado(s)? Esta acción no se puede deshacer.`, confirmText: 'Eliminar' })) return;
    const ids = Array.from(selected);
    let ok = 0;
    for (const id of ids) {
      try { await api.delete(`/customers/${id}`); ok++; } catch { /* skip */ }
    }
    toast.success(`${ok} cliente(s) eliminado(s)`);
    setSelected(new Set());
    load();
  };

  const exportCsv = () => {
    const rows = selected.size > 0 ? filtered.filter(c => selected.has(c.id)) : filtered;
    const header = 'Nombre,Tipo,Cédula/RNC,Email,Teléfono,Límite Crédito';
    const lines = rows.map(c => `"${c.name}","${c.type === 'individual' ? 'Persona Física' : 'Empresa'}","${c.cedula || c.rnc || ''}","${c.email || ''}","${c.phone || ''}",${c.creditLimit ?? 0}`);
    const csv = [header, ...lines].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'clientes.csv';
    a.click();
  };

  return (
    <div>
      <PageHeader
        title="Clientes"
        description="Gestión de clientes"
        action={
          <div className="flex gap-2">
            <button onClick={() => setShowImport(true)}
              className="flex items-center gap-2 border border-slate-200 bg-white text-slate-600 px-4 py-2 rounded-lg text-sm hover:bg-slate-50">
              <Upload size={15} /> Importar CSV
            </button>
            <button onClick={() => { setShowForm(true); setEditing(null); }}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
              <Plus size={16} /> Nuevo Cliente
            </button>
          </div>
        }
      />

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <form onSubmit={save} className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{editing ? 'Editar' : 'Nuevo'} Cliente</h2>
              {!editing && <BranchBadge mode="global" />}
            </div>
            <div className="space-y-3">
              <input required placeholder="Nombre *" value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              <select value={form.type} onChange={e => setForm({...form, type: e.target.value})}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                <option value="individual">Persona Física</option>
                <option value="business">Empresa</option>
              </select>
              {form.type === 'individual'
                ? <input placeholder="Cédula (11 dígitos)" value={form.cedula} onChange={e => setForm({...form, cedula: e.target.value})}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                : <input placeholder="RNC (9 dígitos)" value={form.rnc} onChange={e => setForm({...form, rnc: e.target.value})}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              }
              <input placeholder="Email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              <input placeholder="Teléfono" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              <div>
                <label className="block text-xs text-slate-500 mb-1">Límite de crédito (RD$) — 0 = sin límite</label>
                <input type="number" min="0" step="100" placeholder="0.00 = sin límite"
                  value={form.creditLimit} onChange={e => setForm({...form, creditLimit: e.target.value})}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700">Guardar</button>
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-slate-200 py-2 rounded-lg text-sm hover:bg-slate-50">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* Search + bulk bar */}
      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={search}
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
              <th className="text-left px-4 py-3 text-slate-500 font-medium">Tipo</th>
              <th className="text-left px-4 py-3 text-slate-500 font-medium">Cédula/RNC</th>
              <th className="text-left px-4 py-3 text-slate-500 font-medium">Email</th>
              <th className="text-left px-4 py-3 text-slate-500 font-medium">Teléfono</th>
              <th className="text-right px-4 py-3 text-slate-500 font-medium">Límite Crédito</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="text-center py-8 text-slate-400">
                {customers.length === 0 ? 'No hay clientes registrados' : 'No se encontraron resultados'}
              </td></tr>
            )}
            {filtered.map(c => (
              <tr key={c.id} className={`border-b border-slate-50 hover:bg-slate-50 ${selected.has(c.id) ? 'bg-blue-50/50' : ''}`}>
                <td className="px-4 py-3">
                  <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} className="rounded" />
                </td>
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3 text-slate-500">{c.type === 'individual' ? 'Persona Física' : 'Empresa'}</td>
                <td className="px-4 py-3 text-slate-500">{c.cedula || c.rnc || '-'}</td>
                <td className="px-4 py-3 text-slate-500">{c.email || '-'}</td>
                <td className="px-4 py-3 text-slate-500">{c.phone || '-'}</td>
                <td className="px-4 py-3 text-right text-slate-500">
                  {c.creditLimit && Number(c.creditLimit) > 0 ? `RD$${Number(c.creditLimit).toLocaleString('es-DO')}` : '—'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => openEdit(c)} className="text-slate-400 hover:text-blue-600"><Pencil size={15} /></button>
                    <button onClick={() => remove(c.id)} className="text-slate-400 hover:text-red-600"><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showImport && (
        <CsvImportModal
          title="Clientes"
          endpoint="/customers/import/csv"
          templateHeaders="Nombre,RNC,Cédula,Email,Teléfono,Dirección,Límite de Crédito"
          templateExample="Colmado Don Luis,123456789,,don@luis.com,809-555-1234,Calle 1 #5,5000"
          onSuccess={load}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  );
}
