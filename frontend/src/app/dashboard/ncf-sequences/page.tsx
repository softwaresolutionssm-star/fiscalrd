'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

interface NcfSequence {
  id: string;
  ncfType: string;
  currentSequence: number;
  startSequence: number;
  endSequence: number;
  isActive: boolean;
}

const NCF_TYPES = ['E31','E32','E33','E34','E41','E43','E44','E45'];
const NCF_LABELS: Record<string, string> = {
  E31: 'Crédito Fiscal', E32: 'Consumidor Final',
  E33: 'Nota de Débito', E34: 'Nota de Crédito',
  E41: 'Comprobante de Compras', E43: 'Gastos Menores',
  E44: 'Régimen Especial', E45: 'Gubernamental',
};

export default function NcfSequencesPage() {
  const [items, setItems] = useState<NcfSequence[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ncfType: 'E32', startSequence: '1', endSequence: '9999999' });

  const load = () => api.get('/ncf-sequences').then(r => setItems(r.data.data ?? [])).catch(() => {});
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/ncf-sequences', {
        ncfType: form.ncfType,
        startSequence: parseInt(form.startSequence),
        endSequence: parseInt(form.endSequence),
      });
      toast.success('Secuencia NCF creada');
      setShowForm(false);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Error');
    }
  };

  const getProgress = (seq: NcfSequence) => {
    const used = seq.currentSequence - seq.startSequence + 1;
    const total = seq.endSequence - seq.startSequence + 1;
    return Math.round((used / total) * 100);
  };

  return (
    <div>
      <PageHeader
        title="Secuencias NCF"
        description="Rangos de comprobantes fiscales autorizados por la DGII"
        action={<button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"><Plus size={16} /> Nueva Secuencia</button>}
      />

      {showForm && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 mb-6">
          <h2 className="font-semibold text-slate-700 mb-4">Nueva Secuencia NCF</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Tipo NCF *</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.ncfType} onChange={e => setForm({ ...form, ncfType: e.target.value })}>
                {NCF_TYPES.map(t => <option key={t} value={t}>{t} — {NCF_LABELS[t]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Desde</label>
              <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.startSequence} onChange={e => setForm({ ...form, startSequence: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Hasta</label>
              <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.endSequence} onChange={e => setForm({ ...form, endSequence: e.target.value })} />
            </div>
            <div className="col-span-3 flex gap-2 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-slate-50">Cancelar</button>
              <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Crear</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.length === 0 && (
          <div className="col-span-3 bg-white rounded-xl border border-slate-100 shadow-sm p-8 text-center text-slate-400">
            No hay secuencias configuradas. Crea una para poder emitir ventas.
          </div>
        )}
        {items.map(seq => {
          const progress = seq.currentSequence > 0 ? getProgress(seq) : 0;
          const remaining = seq.endSequence - seq.currentSequence;
          return (
            <div key={seq.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="text-2xl font-bold text-blue-600">{seq.ncfType}</span>
                  <p className="text-xs text-slate-500">{NCF_LABELS[seq.ncfType]}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${seq.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                  {seq.isActive ? 'Activa' : 'Inactiva'}
                </span>
              </div>
              <div className="space-y-1 text-sm text-slate-600 mb-3">
                <div className="flex justify-between"><span>Último usado:</span><span className="font-mono">{String(seq.currentSequence).padStart(8, '0')}</span></div>
                <div className="flex justify-between"><span>Disponibles:</span><span className="font-medium text-green-700">{remaining.toLocaleString()}</span></div>
                <div className="flex justify-between"><span>Rango:</span><span className="font-mono text-xs">{seq.startSequence} — {seq.endSequence}</span></div>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className={`h-2 rounded-full transition-all ${progress > 80 ? 'bg-red-500' : progress > 50 ? 'bg-orange-400' : 'bg-blue-500'}`} style={{ width: `${Math.min(progress, 100)}%` }} />
              </div>
              <p className="text-xs text-slate-400 mt-1">{progress}% utilizado</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
