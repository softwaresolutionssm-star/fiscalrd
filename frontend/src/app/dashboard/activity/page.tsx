'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Activity, Receipt, X, Package, Users, ShoppingCart, DollarSign, RefreshCw } from 'lucide-react';

interface AuditEntry {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  action: string;
  entity: string;
  entityId: string;
  details: Record<string, any>;
  createdAt: string;
}

const ACTION_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  SALE_ISSUED:      { label: 'Factura emitida',    color: 'bg-green-100 text-green-700',  icon: <Receipt size={13} /> },
  SALE_CANCELLED:   { label: 'Factura anulada',    color: 'bg-red-100 text-red-700',      icon: <X size={13} /> },
  SALE_RETURNED:    { label: 'Devolución',          color: 'bg-amber-100 text-amber-700',  icon: <RefreshCw size={13} /> },
  PURCHASE_CREATED: { label: 'Compra registrada',  color: 'bg-blue-100 text-blue-700',    icon: <ShoppingCart size={13} /> },
  USER_LOGIN:       { label: 'Inicio de sesión',   color: 'bg-slate-100 text-slate-600',  icon: <Users size={13} /> },
  USER_CREATED:     { label: 'Usuario creado',     color: 'bg-purple-100 text-purple-700',icon: <Users size={13} /> },
  PRODUCT_ADJUSTED: { label: 'Ajuste inventario',  color: 'bg-orange-100 text-orange-700',icon: <Package size={13} /> },
  PAYMENT_RECEIVED: { label: 'Pago recibido',      color: 'bg-teal-100 text-teal-700',    icon: <DollarSign size={13} /> },
};

const ENTITY_FILTER = [
  { value: '', label: 'Todo' },
  { value: 'sale', label: 'Ventas' },
  { value: 'purchase', label: 'Compras' },
  { value: 'user', label: 'Usuarios' },
  { value: 'product', label: 'Inventario' },
];

export default function ActivityPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [entity, setEntity] = useState('');
  const [page, setPage] = useState(0);
  const limit = 50;

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get('/audit-logs', { params: { limit, offset: page * limit, entity: entity || undefined } });
      const d = r.data?.data ?? r.data;
      setEntries(d.data ?? d);
      setTotal(d.total ?? (d.data ?? d).length);
    } catch { setEntries([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [entity, page]);

  return (
    <div>
      <PageHeader
        title="Actividad del Sistema"
        description="Historial de acciones realizadas en tu negocio"
        action={
          <button onClick={load} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg px-3 py-2">
            <RefreshCw size={14} /> Actualizar
          </button>
        }
      />

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        {ENTITY_FILTER.map(f => (
          <button
            key={f.value}
            onClick={() => { setEntity(f.value); setPage(0); }}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              entity === f.value
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <div className="w-6 h-6 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin mr-3" />
            Cargando actividad...
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-16">
            <Activity size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-400">No hay registros de actividad</p>
            <p className="text-sm text-slate-400 mt-1">Las acciones aparecerán aquí a medida que se realicen</p>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['Acción', 'Usuario', 'Detalles', 'Fecha'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-slate-500 font-medium text-xs uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map(e => {
                  const meta = ACTION_META[e.action] ?? { label: e.action, color: 'bg-slate-100 text-slate-600', icon: <Activity size={13} /> };
                  return (
                    <tr key={e.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${meta.color}`}>
                          {meta.icon} {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{e.userName || '—'}</p>
                        <p className="text-xs text-slate-400">{e.userEmail || ''}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {e.details?.ncfNumber && <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded mr-1">{e.details.ncfNumber}</span>}
                        {e.details?.customerName && <span>{e.details.customerName}</span>}
                        {e.details?.total !== undefined && (
                          <span className="ml-1 font-semibold text-slate-700">
                            RD${Number(e.details.total).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                          </span>
                        )}
                        {!e.details?.ncfNumber && !e.details?.customerName && e.entityId && (
                          <span className="text-xs font-mono text-slate-400">{e.entityId.slice(0, 8)}...</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                        {new Intl.DateTimeFormat('es-DO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Santo_Domingo' }).format(new Date(e.createdAt.endsWith('Z') || e.createdAt.includes('+') ? e.createdAt : e.createdAt + 'Z'))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination */}
            {total > limit && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-sm text-slate-500">
                <span>{total} registros totales</span>
                <div className="flex gap-2">
                  <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50">
                    ← Anterior
                  </button>
                  <span className="px-3 py-1.5 text-slate-600">Página {page + 1}</span>
                  <button disabled={(page + 1) * limit >= total} onClick={() => setPage(p => p + 1)}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50">
                    Siguiente →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
