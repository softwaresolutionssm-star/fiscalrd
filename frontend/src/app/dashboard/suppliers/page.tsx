'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Pencil, Trash2, Download } from 'lucide-react';
import { BranchBadge } from '@/components/ui/branch-badge';
import { useConfirm } from '@/components/ui/confirm-dialog';

interface Supplier { id: string; name: string; rnc?: string; contactName?: string; email?: string; phone?: string; }

export default function SuppliersPage() {
  const confirm = useConfirm();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState({ name: '', rnc: '', contactName: '', email: '', phone: '' });

  const load = () => api.get('/suppliers').then(r => setSuppliers(r.data.data ?? [])).catch(() => null);
  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.patch(`/suppliers/${editing!.id}`, form);
      toast.success('Proveedor actualizado');
      setEditing(null); load();
    } catch { toast.error('Error al guardar'); }
  };

  const remove = async (id: string) => {
    if (!await confirm({ title: 'Eliminar proveedor', message: '¿Estás seguro de que deseas eliminar este proveedor?', confirmText: 'Eliminar' })) return;
    try { await api.delete(`/suppliers/${id}`); toast.success('Eliminado'); load(); } catch { toast.error('Error'); }
  };

  const exportCsv = () => {
    const header = 'Nombre,RNC,Contacto,Email,Teléfono';
    const lines = suppliers.map(s => `"${s.name}","${s.rnc ?? ''}","${s.contactName ?? ''}","${s.email ?? ''}","${s.phone ?? ''}"`);
    const csv = [header, ...lines].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'proveedores.csv';
    a.click();
  };

  return (
    <div>
      <PageHeader title="Proveedores" description="Los proveedores se crean desde Compras al registrar una nueva compra"
        action={
          <button onClick={exportCsv} className="flex items-center gap-2 border border-slate-200 bg-white text-slate-600 px-4 py-2 rounded-lg text-sm hover:bg-slate-50">
            <Download size={15} /> Exportar CSV
          </button>
        }
      />

      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <form onSubmit={save} className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{editing ? 'Editar' : 'Nuevo'} Proveedor</h2>
              <BranchBadge mode="global" />
            </div>
            <div className="space-y-3">
              {([['name','Nombre *', true],['rnc','RNC', false],['contactName','Contacto', false],['email','Email', false],['phone','Teléfono', false]] as const).map(([key, label, req]) => (
                <input key={key} required={req} placeholder={label} value={form[key]}
                  onChange={e => setForm({ ...form, [key]: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700">Guardar</button>
              <button type="button" onClick={() => setEditing(null)} className="flex-1 border border-slate-200 py-2 rounded-lg text-sm hover:bg-slate-50">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>{['Nombre','RNC','Contacto','Email','Teléfono',''].map(h => <th key={h} className="text-left px-4 py-3 text-slate-500 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {suppliers.length === 0 && (
              <tr><td colSpan={6} className="text-center py-8 text-slate-400">
                No hay proveedores — se crean automáticamente al registrar compras
              </td></tr>
            )}
            {suppliers.map(s => (
              <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">{s.name}</td>
                <td className="px-4 py-3 text-slate-500 font-mono">{s.rnc || '-'}</td>
                <td className="px-4 py-3 text-slate-500">{s.contactName || '-'}</td>
                <td className="px-4 py-3 text-slate-500">{s.email || '-'}</td>
                <td className="px-4 py-3 text-slate-500">{s.phone || '-'}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => { setEditing(s); setForm({ name: s.name, rnc: s.rnc ?? '', contactName: s.contactName ?? '', email: s.email ?? '', phone: s.phone ?? '' }); }}
                      className="text-slate-400 hover:text-blue-600"><Pencil size={15} /></button>
                    <button onClick={() => remove(s.id)} className="text-slate-400 hover:text-red-600"><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
