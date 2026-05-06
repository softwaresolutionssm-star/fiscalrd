'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import { toast } from 'sonner';
import { PageHeader } from '@/components/ui/page-header';
import Link from 'next/link';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { useConfirm } from '@/components/ui/confirm-dialog';

interface ScheduleRecord {
  id: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  weeklyHours: number;
  lunchMinutes: number;
  templateId?: string;
  notes?: string;
}
interface ExceptionRecord {
  id: string;
  kind: string;
  dateFrom: string;
  dateTo: string;
  paid: boolean;
  approvedBy?: string;
  notes?: string;
}

const KIND_LABELS: Record<string, string> = {
  day_off: 'Día libre', vacation: 'Vacaciones', sick: 'Enfermedad',
  permission: 'Permiso', extra: 'Extra (+35%)', holiday: 'Feriado',
  holiday_work: 'Trabaja feriado (+100%)', suspension: 'Suspensión',
  maternity: 'Maternidad', paternity: 'Paternidad',
};
const KIND_COLOR: Record<string, string> = {
  day_off: 'bg-orange-100 text-orange-700', vacation: 'bg-purple-100 text-purple-700',
  sick: 'bg-red-100 text-red-700', permission: 'bg-yellow-100 text-yellow-700',
  extra: 'bg-green-100 text-green-700', holiday_work: 'bg-green-200 text-green-900',
  suspension: 'bg-slate-200 text-slate-700', maternity: 'bg-fuchsia-100 text-fuchsia-700',
  paternity: 'bg-cyan-100 text-cyan-700', holiday: 'bg-pink-100 text-pink-700',
};

function formatDate(d: string) { const [y, m, dd] = d.split('-'); return `${dd}/${m}/${y}`; }

export default function EmpleadoHistorialPage() {
  const confirm = useConfirm();
  const { id } = useParams<{ id: string }>();
  const [history, setHistory]     = useState<ScheduleRecord[]>([]);
  const [exceptions, setExceptions] = useState<ExceptionRecord[]>([]);
  const [empName, setEmpName]     = useState('');
  const [loading, setLoading]     = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [histRes, excRes, empRes] = await Promise.all([
        api.get(`/schedules/employee/${id}/history`),
        api.get(`/schedules/employee/${id}/exceptions`),
        api.get(`/employees/${id}`),
      ]);
      setHistory(histRes.data?.data ?? histRes.data ?? []);
      setExceptions(excRes.data?.data ?? excRes.data ?? []);
      const emp = empRes.data?.data ?? empRes.data;
      if (emp) setEmpName(`${emp.firstName} ${emp.lastName}`);
    } catch { toast.error('Error cargando historial'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const deleteException = async (excId: string) => {
    if (!await confirm({ title: 'Eliminar excepción', message: '¿Eliminar esta excepción del horario del empleado?', confirmText: 'Eliminar' })) return;
    try {
      await api.delete(`/schedules/exceptions/${excId}`);
      toast.success('Excepción eliminada');
      load();
    } catch { toast.error('Error al eliminar'); }
  };

  return (
    <div>
      <PageHeader
        title={`Historial — ${empName}`}
        description="Registro completo de horarios y excepciones"
        action={
          <Link href="/dashboard/schedules" className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
            <ArrowLeft size={14} /> Volver
          </Link>
        }
      />

      {loading ? (
        <div className="text-center py-12 text-slate-400">Cargando...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Historial de horarios */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-800 mb-4">Historial de Horarios</h2>
            {history.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">Sin horarios registrados</p>
            ) : (
              <div className="space-y-3">
                {history.map((h, i) => (
                  <div key={h.id} className={`border rounded-lg p-3 ${i === 0 ? 'border-blue-200 bg-blue-50/40' : 'border-slate-200'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${i === 0 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                        {i === 0 ? 'Vigente' : 'Anterior'}
                      </span>
                      <span className="text-xs text-slate-500">{h.weeklyHours}h/sem</span>
                    </div>
                    <div className="text-sm font-medium text-slate-800">
                      {formatDate(h.effectiveFrom)} → {h.effectiveTo ? formatDate(h.effectiveTo) : 'hasta hoy'}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Almuerzo: {h.lunchMinutes} min
                      {h.notes && <span className="ml-2">· {h.notes}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Excepciones */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-800 mb-4">Excepciones Registradas</h2>
            {exceptions.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">Sin excepciones registradas</p>
            ) : (
              <div className="space-y-2">
                {exceptions.map(exc => (
                  <div key={exc.id} className="flex items-start justify-between border border-slate-100 rounded-lg p-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${KIND_COLOR[exc.kind] ?? 'bg-slate-100 text-slate-600'}`}>
                          {KIND_LABELS[exc.kind] ?? exc.kind}
                        </span>
                        {!exc.paid && <span className="text-xs text-red-500">Sin goce</span>}
                      </div>
                      <div className="text-sm text-slate-700">
                        {formatDate(exc.dateFrom)} → {formatDate(exc.dateTo)}
                      </div>
                      {exc.approvedBy && <div className="text-xs text-slate-400 mt-0.5">Aprobado por: {exc.approvedBy}</div>}
                      {exc.notes && <div className="text-xs text-slate-400">{exc.notes}</div>}
                    </div>
                    <button onClick={() => deleteException(exc.id)} className="text-red-400 hover:text-red-600 p-1 flex-shrink-0">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
