'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Plus, Eye, CheckCircle, XCircle, Search, Wifi, WifiOff, Clock, AlertCircle, RefreshCw, Download } from 'lucide-react';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { formatCurrency, formatDate } from '@/lib/utils';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';

interface Sale {
  id: string;
  ncfNumber?: string;
  ncfType: string;
  saleDate: string;
  customerName?: string;
  subtotal: number;
  itbisTotal: number;
  total: number;
  status: string;
  dgiiStatus?: string;
  trackId?: string;
}

const statusLabel: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Borrador', color: 'bg-slate-100 text-slate-600' },
  ISSUED: { label: 'Emitida', color: 'bg-green-100 text-green-700' },
  CANCELLED: { label: 'Anulada', color: 'bg-red-100 text-red-700' },
};

export default function SalesPage() {
  const confirm = useConfirm();
  const { user } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // El contador solo puede consultar — no emite ni anula
  const canModify = user?.role !== 'accountant';

  const load = () => api.get('/sales').then(r => setSales(r.data.data ?? [])).catch(() => {});
  useEffect(() => { load(); }, []);

  const isDraft = (s: Sale) => s.status?.toUpperCase() === 'DRAFT';

  const issueAllDrafts = async () => {
    const drafts = sales.filter(isDraft);
    if (drafts.length === 0) { toast.info('No hay ventas en borrador'); return; }
    let ok = 0;
    for (const s of drafts) {
      try { await api.patch(`/sales/${s.id}/issue`); ok++; } catch { /* skip */ }
    }
    toast.success(`${ok} venta(s) emitida(s) — inventario actualizado`);
    load();
  };

  const issue = async (id: string) => {
    try {
      await api.patch(`/sales/${id}/issue`);
      toast.success('Venta emitida — NCF asignado');
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Error al emitir');
    }
  };

  const retryAlanube = async (id: string) => {
    try {
      await api.post(`/sales/${id}/retry-alanube`);
      toast.success('Reintento enviado a Alanube');
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Error al reintentar');
    }
  };

  const cancel = async (id: string) => {
    if (!await confirm({ title: 'Anular venta', message: '¿Estás seguro de que deseas anular esta venta? Esta acción no se puede deshacer.', confirmText: 'Anular' })) return;
    try {
      await api.patch(`/sales/${id}/cancel`);
      toast.success('Venta anulada');
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Error al anular');
    }
  };

  const filtered = sales.filter(s => {
    const matchSearch =
      !search ||
      (s.customerName ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (s.ncfNumber ?? '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // ── Bulk selection ──────────────────────────────────────────────────────────
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const allSelected = filtered.length > 0 && filtered.every(s => selected.has(s.id));
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(filtered.map(s => s.id)));
  const toggle = (id: string) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const exportCsv = () => {
    const rows = selected.size > 0 ? filtered.filter(s => selected.has(s.id)) : filtered;
    const header = 'NCF,Tipo,Cliente,Fecha,Subtotal,ITBIS,Total,Estado';
    const lines = rows.map(s => `"${s.ncfNumber ?? ''}","${s.ncfType}","${s.customerName ?? 'Consumidor Final'}","${s.saleDate}",${s.subtotal},${s.itbisTotal},${s.total},"${s.status}"`);
    const csv = [header, ...lines].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'ventas.csv';
    a.click();
  };

  return (
    <div>
      <PageHeader
        title="Ventas"
        description="Gestión de comprobantes fiscales"
        action={canModify ? (
          <Link href="/dashboard/sales/new" className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
            <Plus size={16} /> Nueva Venta
          </Link>
        ) : undefined}
      />

      {/* Search and filter bar */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por cliente o NCF..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
        >
          <option value="">Todos los estados</option>
          <option value="ISSUED">Emitida</option>
          <option value="CANCELLED">Anulada</option>
          <option value="DRAFT">Borrador</option>
        </select>
        <button onClick={exportCsv} className="flex items-center gap-1.5 border border-slate-200 bg-white text-slate-600 px-3 py-2 rounded-lg text-sm hover:bg-slate-50">
          <Download size={14} /> Exportar{selected.size > 0 ? ` (${selected.size})` : ''}
        </button>
      </div>

      {sales.some(isDraft) && (
        <div className="mb-4 flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <p className="text-sm text-amber-800">
            <strong>{sales.filter(isDraft).length} venta(s) en borrador</strong> — no han descontado inventario ni tienen NCF asignado.
          </p>
          <button onClick={issueAllDrafts}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 whitespace-nowrap ml-4">
            <CheckCircle size={15} /> Emitir todas
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-4 py-3 w-8">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} className="rounded" />
              </th>
              <th className="text-left px-4 py-3 text-slate-600 font-medium">NCF</th>
              <th className="text-left px-4 py-3 text-slate-600 font-medium">Tipo</th>
              <th className="text-left px-4 py-3 text-slate-600 font-medium">Cliente</th>
              <th className="text-left px-4 py-3 text-slate-600 font-medium">Fecha</th>
              <th className="text-right px-4 py-3 text-slate-600 font-medium">Subtotal</th>
              <th className="text-right px-4 py-3 text-slate-600 font-medium">ITBIS</th>
              <th className="text-right px-4 py-3 text-slate-600 font-medium">Total</th>
              <th className="text-center px-4 py-3 text-slate-600 font-medium">Estado</th>
              <th className="text-center px-4 py-3 text-slate-600 font-medium">DGII</th>
              <th className="text-right px-4 py-3 text-slate-600 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={10} className="text-center py-8 text-slate-400">
                {sales.length === 0 ? 'No hay ventas registradas' : 'No se encontraron resultados'}
              </td></tr>
            )}
            {filtered.map(s => {
              const st = statusLabel[s.status] ?? { label: s.status, color: 'bg-slate-100 text-slate-600' };
              return (
                <tr key={s.id} className={`border-b border-slate-50 hover:bg-slate-50 ${selected.has(s.id) ? 'bg-blue-50/50' : ''}`}>
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggle(s.id)} className="rounded" />
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-700">{s.ncfNumber ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{s.ncfType}</td>
                  <td className="px-4 py-3 text-slate-500">{s.customerName ?? 'Consumidor Final'}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(s.saleDate)}</td>
                  <td className="px-4 py-3 text-right text-slate-700">{formatCurrency(s.subtotal)}</td>
                  <td className="px-4 py-3 text-right text-slate-700">{formatCurrency(s.itbisTotal)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800">{formatCurrency(s.total)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>{st.label}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {s.status === 'ISSUED' && (() => {
                      const d = s.dgiiStatus ?? 'NO_ENVIADO';
                      if (d === 'ACEPTADO') return <span title="Aceptado por DGII" className="inline-flex items-center gap-1 text-xs text-green-600 font-medium"><Wifi size={13}/>DGII ✓</span>;
                      if (d === 'RECHAZADO') return <button onClick={() => retryAlanube(s.id)} title="Reintentar envío a DGII" className="inline-flex items-center gap-1 text-xs text-red-600 font-medium hover:text-red-700"><WifiOff size={13}/>Rechazado <RefreshCw size={11}/></button>;
                      if (d === 'PENDIENTE') return <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-medium"><Clock size={13}/>Pendiente</span>;
                      return <button onClick={() => retryAlanube(s.id)} title="Enviar a DGII" className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-blue-600"><AlertCircle size={13}/>No enviado <RefreshCw size={11}/></button>;
                    })()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/dashboard/sales/${s.id}`} className="text-slate-400 hover:text-slate-600"><Eye size={15} /></Link>
                      {isDraft(s) && (
                        <button onClick={() => issue(s.id)}
                          className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white text-xs font-medium px-2.5 py-1 rounded-lg">
                          <CheckCircle size={13} /> Emitir
                        </button>
                      )}
                      {s.status?.toUpperCase() === 'ISSUED' && (
                        <button onClick={() => cancel(s.id)} title="Anular" className="text-red-500 hover:text-red-600"><XCircle size={15} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
