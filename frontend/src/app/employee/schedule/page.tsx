'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Calendar, Clock, Sun, Umbrella, Plus, CheckCircle2, XCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface DayBlock { start: string; end: string; }
interface DayCellData {
  type: string;
  blocks?: DayBlock[];
  paid?: boolean;
  status?: 'done' | 'today' | 'upcoming';
}
interface VacationBalance { entitled: number; used: number; available: number; yearsWorked: number; hireDate: string | null; canRequest: boolean; nextAnniversary: string | null; }
interface VacationRequest {
  id: string; dateFrom: string; dateTo: string; notes?: string;
  status: 'pending' | 'approved' | 'rejected'; reviewNote?: string; reviewedBy?: string;
}
interface ScheduleData {
  schedule: {
    weeklyHours: number; lunchMinutes: number;
    scheduleData: Record<string, { isWorking: boolean; blocks: DayBlock[] }>;
    notes?: string;
  } | null;
  exceptions: Array<{ id: string; kind: string; dateFrom: string; dateTo: string; paid: boolean; notes?: string }>;
  thisWeek: Record<string, DayCellData>;
  nextVacation: { kind: string; dateFrom: string; dateTo: string } | null;
  vacationBalance: VacationBalance;
  pendingRequests: VacationRequest[];
}

const DAY_NAMES_ES: Record<string, string> = {
  monday: 'Lunes', tuesday: 'Martes', wednesday: 'Miércoles',
  thursday: 'Jueves', friday: 'Viernes', saturday: 'Sábado', sunday: 'Domingo',
};
const DAY_KEYS_ORDERED = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];

const CELL_CFG: Record<string, { label: string; bg: string; text: string }> = {
  work:       { label: 'Trabajo',    bg: 'bg-blue-50',    text: 'text-blue-700' },
  off:        { label: 'Libre',      bg: 'bg-slate-50',   text: 'text-slate-400' },
  day_off:    { label: 'Día libre',  bg: 'bg-orange-50',  text: 'text-orange-700' },
  vacation:   { label: 'Vacaciones', bg: 'bg-purple-50',  text: 'text-purple-700' },
  sick:       { label: 'Enfermedad', bg: 'bg-red-50',     text: 'text-red-700' },
  permission: { label: 'Permiso',    bg: 'bg-yellow-50',  text: 'text-yellow-700' },
  extra:      { label: 'Extra',      bg: 'bg-green-50',   text: 'text-green-700' },
  holiday_work: { label: 'Trabaja feriado', bg: 'bg-green-100', text: 'text-green-800' },
  suspension: { label: 'Suspensión', bg: 'bg-slate-100',  text: 'text-slate-600' },
  maternity:  { label: 'Maternidad', bg: 'bg-fuchsia-50', text: 'text-fuchsia-700' },
  paternity:  { label: 'Paternidad', bg: 'bg-cyan-50',    text: 'text-cyan-700' },
  holiday:    { label: 'Feriado',    bg: 'bg-pink-50',    text: 'text-pink-700' },
};

const STATUS_CFG = {
  pending:  { label: 'Pendiente',  color: 'bg-yellow-100 text-yellow-700', icon: AlertCircle },
  approved: { label: 'Aprobada',   color: 'bg-green-100 text-green-700',   icon: CheckCircle2 },
  rejected: { label: 'Rechazada',  color: 'bg-red-100 text-red-700',       icon: XCircle },
};

function getDayAbbr(date: string) {
  const d = new Date(date + 'T12:00:00');
  return ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][d.getDay()];
}
function fmtDate(d: string) { const [y,m,dd] = d.split('-'); return `${dd}/${m}/${y}`; }

// ─── Modal solicitar vacaciones ───────────────────────────────────────────────

function RequestVacationModal({ employeeId, employeeName, balance, onClose, onSaved }: {
  employeeId: string; employeeName: string;
  balance: VacationBalance; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState({
    dateFrom: new Date().toISOString().split('T')[0],
    dateTo: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [loading, setLoading] = useState(false);

  const save = async () => {
    setLoading(true);
    try {
      await api.post('/schedules/vacation-requests', {
        employeeId,
        employeeName,
        ...form,
      });
      toast.success('Solicitud enviada correctamente');
      onSaved();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Error al enviar solicitud');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
        <h2 className="text-lg font-semibold mb-1">Solicitar Vacaciones</h2>
        <div className="bg-purple-50 border border-purple-100 rounded-lg px-3 py-2 mb-4">
          <span className="text-sm text-purple-700 font-medium">{balance.available} días disponibles</span>
          <span className="text-xs text-purple-500 ml-2">de {balance.entitled} que te corresponden</span>
        </div>
        <div className="space-y-3 mb-4">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Desde</label>
              <input type="date" value={form.dateFrom} onChange={e => setForm({ ...form, dateFrom: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Hasta</label>
              <input type="date" value={form.dateTo} onChange={e => setForm({ ...form, dateTo: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <textarea placeholder="Notas opcionales..." value={form.notes}
            onChange={e => setForm({ ...form, notes: e.target.value })} rows={2}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none" />
        </div>
        <div className="flex gap-2">
          <button onClick={save} disabled={loading}
            className="flex-1 bg-purple-600 text-white py-2 rounded-lg text-sm disabled:opacity-50">
            {loading ? 'Enviando...' : 'Enviar Solicitud'}
          </button>
          <button onClick={onClose} className="flex-1 border border-slate-200 py-2 rounded-lg text-sm">Cancelar</button>
        </div>
      </div>
    </div>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function EmployeeSchedulePage() {
  const { user } = useAuth();
  const [data, setData]           = useState<ScheduleData | null>(null);
  const [loading, setLoading]     = useState(true);
  const [showRequest, setShowRequest] = useState(false);
  const todayStr = new Date().toISOString().split('T')[0];

  const load = () => {
    api.get('/schedules/my-schedule')
      .then(r => setData(r.data?.data ?? r.data))
      .catch(() => toast.error('Error cargando tu horario'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="text-center py-12 text-slate-400">Cargando tu horario...</div>;

  const { schedule, thisWeek, nextVacation, vacationBalance: balance, pendingRequests } = data ?? {
    schedule: null, thisWeek: {}, nextVacation: null,
    vacationBalance: { entitled: 0, used: 0, available: 0, yearsWorked: 0, hireDate: null, canRequest: false, nextAnniversary: null },
    pendingRequests: [],
  };
  const weekEntries = Object.entries(thisWeek).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mi Horario</h1>
          <p className="text-sm text-slate-500 mt-1">Esta semana de trabajo</p>
          {user?.role === 'cashier' && (
            <Link href="/pos" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1">
              <ArrowLeft size={12} /> Volver al POS
            </Link>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <button
            onClick={() => balance.canRequest ? setShowRequest(true) : null}
            disabled={!balance.canRequest}
            title={!balance.canRequest && balance.nextAnniversary ? `Disponible a partir del ${balance.nextAnniversary}` : undefined}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors
              ${balance.canRequest
                ? 'bg-purple-600 text-white hover:bg-purple-700'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
            <Plus size={15} /> Solicitar vacaciones
          </button>
          {!balance.canRequest && balance.nextAnniversary && (
            <p className="text-xs text-slate-400">Disponible el {balance.nextAnniversary.split('-').reverse().join('/')}</p>
          )}
        </div>
      </div>

      {/* Aviso sin horario */}
      {!schedule && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-5 flex items-center gap-3">
          <Calendar size={18} className="text-yellow-600 flex-shrink-0" />
          <p className="text-sm text-yellow-700">Aún no tienes un horario asignado. Puedes solicitar vacaciones cuando corresponda.</p>
        </div>
      )}

      {/* Resumen */}
      {schedule && (
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-center gap-2">
          <Clock size={18} className="text-blue-600 flex-shrink-0" />
          <div>
            <div className="text-lg font-bold text-blue-800">{schedule.weeklyHours}h</div>
            <div className="text-xs text-blue-600">por semana</div>
          </div>
        </div>
        <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 flex items-center gap-2">
          <Sun size={18} className="text-orange-600 flex-shrink-0" />
          <div>
            <div className="text-lg font-bold text-orange-800">{schedule.lunchMinutes}m</div>
            <div className="text-xs text-orange-600">almuerzo</div>
          </div>
        </div>
        <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 flex items-center gap-2">
          <Umbrella size={18} className="text-purple-600 flex-shrink-0" />
          <div>
            <div className="text-lg font-bold text-purple-800">{balance.available}</div>
            <div className="text-xs text-purple-600">días vacac.</div>
          </div>
        </div>
      </div>
      )}

      {/* Saldo de vacaciones detallado */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-5">
        <h2 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <Umbrella size={16} className="text-purple-500" /> Vacaciones {new Date().getFullYear()}
        </h2>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-2xl font-bold text-slate-800">{balance.entitled}</div>
            <div className="text-xs text-slate-500">días que te corresponden</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-500">{balance.used}</div>
            <div className="text-xs text-slate-500">días usados</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">{balance.available}</div>
            <div className="text-xs text-slate-500">días disponibles</div>
          </div>
        </div>
        {balance.yearsWorked > 0 && (
          <p className="text-xs text-slate-400 text-center mt-2">
            Basado en {balance.yearsWorked} año{balance.yearsWorked !== 1 ? 's' : ''} en la empresa
          </p>
        )}
      </div>

      {/* Solicitudes pendientes / historial */}
      {pendingRequests.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-5">
          <h2 className="font-semibold text-slate-800 mb-3">Mis Solicitudes de Vacaciones</h2>
          <div className="space-y-2">
            {pendingRequests.map(req => {
              const cfg = STATUS_CFG[req.status] ?? STATUS_CFG.pending;
              const Icon = cfg.icon;
              return (
                <div key={req.id} className="flex items-start justify-between border border-slate-100 rounded-lg p-3">
                  <div>
                    <div className="text-sm font-medium text-slate-800">
                      {fmtDate(req.dateFrom)} → {fmtDate(req.dateTo)}
                    </div>
                    {req.notes && <div className="text-xs text-slate-400 mt-0.5">{req.notes}</div>}
                    {req.reviewNote && <div className="text-xs text-slate-500 mt-1">Nota: {req.reviewNote}</div>}
                  </div>
                  <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${cfg.color}`}>
                    <Icon size={11} /> {cfg.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Próximas vacaciones */}
      {nextVacation && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-5 flex items-center gap-3">
          <Umbrella size={20} className="text-purple-600" />
          <div>
            <div className="font-medium text-purple-800">Vacaciones próximas</div>
            <div className="text-sm text-purple-600">{fmtDate(nextVacation.dateFrom)} – {fmtDate(nextVacation.dateTo)}</div>
          </div>
        </div>
      )}

      {/* Esta semana + Horario habitual — solo si hay horario */}
      {schedule && (
        <>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-5">
            <div className="px-4 py-3 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">Esta Semana</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {weekEntries.map(([dateStr, cell]) => {
                const cfg = CELL_CFG[cell.type] ?? CELL_CFG.off;
                const isToday = dateStr === todayStr;
                return (
                  <div key={dateStr} className={`flex items-center px-4 py-3 ${isToday ? 'bg-blue-50/50' : ''}`}>
                    <div className="w-20 flex-shrink-0">
                      <div className={`text-sm font-medium ${isToday ? 'text-blue-700' : 'text-slate-700'}`}>
                        {getDayAbbr(dateStr)}{isToday ? ' (hoy)' : ''}
                      </div>
                      <div className="text-xs text-slate-400">{fmtDate(dateStr)}</div>
                    </div>
                    <div className={`flex-1 mx-3 rounded-lg px-3 py-2 ${cfg.bg}`}>
                      <div className={`text-sm font-medium ${cfg.text}`}>{cfg.label}</div>
                      {cell.type === 'work' && cell.blocks?.length && (
                        <div className="text-xs text-slate-500 mt-0.5">
                          {cell.blocks.map((b, i) => <span key={i}>{i > 0 ? ' / ' : ''}{b.start} – {b.end}</span>)}
                        </div>
                      )}
                    </div>
                    {isToday && <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">Horario Habitual</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {DAY_KEYS_ORDERED.map(dayKey => {
                const day = schedule.scheduleData?.[dayKey];
                return (
                  <div key={dayKey} className="flex items-center px-4 py-3">
                    <div className="w-24 flex-shrink-0">
                      <span className={`text-sm font-medium ${day?.isWorking ? 'text-slate-700' : 'text-slate-400'}`}>
                        {DAY_NAMES_ES[dayKey]}
                      </span>
                    </div>
                    <div className="flex-1">
                      {day?.isWorking && day.blocks.length > 0 ? (
                        <div className="text-sm text-blue-700">
                          {day.blocks.map((b, i) => (
                            <span key={i}>{i > 0 ? <span className="text-slate-300 mx-1">|</span> : null}{b.start} – {b.end}</span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400 italic">Libre</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {schedule.notes && (
              <div className="px-4 py-3 bg-slate-50 border-t border-slate-100">
                <p className="text-xs text-slate-500">{schedule.notes}</p>
              </div>
            )}
          </div>
        </>
      )}

      {showRequest && user && (
        <RequestVacationModal
          employeeId={user.id}
          employeeName={`${user.firstName} ${user.lastName}`}
          balance={balance}
          onClose={() => setShowRequest(false)}
          onSaved={() => { setShowRequest(false); load(); }}
        />
      )}
    </div>
  );
}
