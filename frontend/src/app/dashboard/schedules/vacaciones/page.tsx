'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import api from '@/lib/api';
import { toast } from 'sonner';
import { CheckCircle2, XCircle, Clock, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface VacationRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  dateFrom: string;
  dateTo: string;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewNote?: string;
  reviewedAt?: string;
  createdAt: string;
}

function fmtDate(d: string) { const [y, m, dd] = d.split('-'); return `${dd}/${m}/${y}`; }

function daysBetween(from: string, to: string) {
  const diff = new Date(to + 'T12:00:00').getTime() - new Date(from + 'T12:00:00').getTime();
  return Math.round(diff / 86400000) + 1;
}

// ─── Modal de revisión ────────────────────────────────────────────────────────

function ReviewModal({ request, onClose, onDone }: {
  request: VacationRequest; onClose: () => void; onDone: () => void;
}) {
  const [reviewNote, setReviewNote] = useState('');
  const [loading, setLoading]       = useState(false);

  const review = async (status: 'approved' | 'rejected') => {
    setLoading(true);
    try {
      await api.patch(`/schedules/vacation-requests/${request.id}/review`, { status, reviewNote: reviewNote || undefined });
      toast.success(status === 'approved' ? 'Solicitud aprobada' : 'Solicitud rechazada');
      onDone();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Error al procesar');
    } finally { setLoading(false); }
  };

  const days = daysBetween(request.dateFrom, request.dateTo);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
        <h2 className="text-lg font-semibold mb-1">Revisar Solicitud de Vacaciones</h2>
        <p className="text-sm text-slate-500 mb-4">{request.employeeName}</p>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Período:</span>
            <span className="font-medium text-slate-800">{fmtDate(request.dateFrom)} → {fmtDate(request.dateTo)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Días solicitados:</span>
            <span className="font-medium text-slate-800">{days} días</span>
          </div>
          {request.notes && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Notas:</span>
              <span className="text-slate-700">{request.notes}</span>
            </div>
          )}
        </div>

        <div className="mb-4">
          <label className="text-xs font-medium text-slate-600 block mb-1">Nota de respuesta (opcional)</label>
          <textarea value={reviewNote} onChange={e => setReviewNote(e.target.value)}
            placeholder="Motivo de aprobación o rechazo..." rows={2}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none" />
        </div>

        <div className="flex gap-2">
          <button onClick={() => review('approved')} disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white py-2.5 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50">
            <CheckCircle2 size={16} /> Aprobar
          </button>
          <button onClick={() => review('rejected')} disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 bg-red-500 text-white py-2.5 rounded-lg text-sm hover:bg-red-600 disabled:opacity-50">
            <XCircle size={16} /> Rechazar
          </button>
          <button onClick={onClose} disabled={loading}
            className="px-4 border border-slate-200 rounded-lg text-sm hover:bg-slate-50">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

const STATUS_CFG = {
  pending:  { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
  approved: { label: 'Aprobada',  color: 'bg-green-100 text-green-700',   dot: 'bg-green-500' },
  rejected: { label: 'Rechazada', color: 'bg-red-100 text-red-700',       dot: 'bg-red-500' },
};

export default function VacacionesPage() {
  const { user } = useAuth();
  const [requests, setRequests]   = useState<VacationRequest[]>([]);
  const [reviewing, setReviewing] = useState<VacationRequest | null>(null);
  const [filter, setFilter]       = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [loading, setLoading]     = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get('/schedules/vacation-requests');
      setRequests(r.data?.data ?? r.data ?? []);
    } catch { toast.error('Error cargando solicitudes'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter);
  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <div>
      <PageHeader
        title="Solicitudes de Vacaciones"
        description="Aprueba o rechaza las solicitudes de tus empleados"
        action={
          <Link href="/dashboard/schedules" className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
            <ArrowLeft size={14} /> Volver a Horarios
          </Link>
        }
      />

      {/* Filtros */}
      <div className="flex gap-2 mb-5">
        {([
          { key: 'pending',  label: `Pendientes${pendingCount > 0 ? ` (${pendingCount})` : ''}` },
          { key: 'approved', label: 'Aprobadas' },
          { key: 'rejected', label: 'Rechazadas' },
          { key: 'all',      label: 'Todas' },
        ] as const).map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
              ${filter === f.key
                ? 'bg-blue-600 text-white'
                : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-slate-400">Cargando...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Clock size={36} className="text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">
              {filter === 'pending' ? 'No hay solicitudes pendientes' : 'No hay solicitudes en esta categoría'}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-5 py-3 font-medium text-slate-600">Empleado</th>
                <th className="text-left px-5 py-3 font-medium text-slate-600">Período</th>
                <th className="text-left px-5 py-3 font-medium text-slate-600">Días</th>
                <th className="text-left px-5 py-3 font-medium text-slate-600">Estado</th>
                <th className="text-left px-5 py-3 font-medium text-slate-600">Solicitado</th>
                <th className="text-left px-5 py-3 font-medium text-slate-600">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(req => {
                const cfg = STATUS_CFG[req.status] ?? STATUS_CFG.pending;
                const days = daysBetween(req.dateFrom, req.dateTo);
                return (
                  <tr key={req.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="px-5 py-3 font-medium text-slate-800">{req.employeeName}</td>
                    <td className="px-5 py-3 text-slate-700">
                      {fmtDate(req.dateFrom)} → {fmtDate(req.dateTo)}
                    </td>
                    <td className="px-5 py-3 text-slate-700">{days} días</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full font-medium ${cfg.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                      </span>
                      {req.reviewedBy && (
                        <div className="text-xs text-slate-400 mt-0.5">por {req.reviewedBy}</div>
                      )}
                      {req.reviewNote && (
                        <div className="text-xs text-slate-500 italic mt-0.5">"{req.reviewNote}"</div>
                      )}
                    </td>
                    <td className="px-5 py-3 text-slate-500 text-xs">
                      {fmtDate(req.createdAt.split('T')[0])}
                    </td>
                    <td className="px-5 py-3">
                      {req.status === 'pending' && (
                        <button onClick={() => setReviewing(req)}
                          className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700">
                          Revisar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {reviewing && (
        <ReviewModal
          request={reviewing}
          onClose={() => setReviewing(null)}
          onDone={() => { setReviewing(null); load(); }}
        />
      )}
    </div>
  );
}
