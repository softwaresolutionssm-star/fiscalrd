'use client';

import { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import api from '@/lib/api';
import { toast } from 'sonner';
import {
  ChevronLeft, ChevronRight, Settings, Clock,
  UserPlus, CalendarDays, AlertCircle, Pencil, Star,
} from 'lucide-react';
import Link from 'next/link';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Employee { id: string; firstName: string; lastName: string; position?: string; department?: string; }
interface Template  { id: string; name: string; weeklyHours: number; }

interface DayCell {
  type: string;
  blocks?: { start: string; end: string }[];
  paid?: boolean;
  note?: string;
  isHoliday?: boolean;
}
interface EmployeeWeekRow {
  employeeId: string;
  weeklyHours: number;
  week: Record<string, DayCell>;
}

const DAYS_ES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const CELL_BG: Record<string, string> = {
  work:         'bg-blue-100 text-blue-800',
  off:          'bg-slate-50 text-slate-400',
  day_off:      'bg-orange-100 text-orange-700',
  vacation:     'bg-purple-100 text-purple-700',
  sick:         'bg-red-100 text-red-700',
  permission:   'bg-yellow-100 text-yellow-700',
  extra:        'bg-green-100 text-green-700',
  holiday:      'bg-pink-100 text-pink-700',
  holiday_work: 'bg-green-200 text-green-900',
  suspension:   'bg-slate-200 text-slate-700',
  maternity:    'bg-fuchsia-100 text-fuchsia-700',
  paternity:    'bg-cyan-100 text-cyan-700',
};
const CELL_LABEL: Record<string, string> = {
  work: 'Trabajo', off: 'Libre', day_off: 'Día libre', vacation: 'Vacaciones',
  sick: 'Enfermedad', permission: 'Permiso', extra: 'Extra', holiday: 'Feriado',
  holiday_work: 'Trabaja feriado', suspension: 'Suspensión',
  maternity: 'Maternidad', paternity: 'Paternidad',
};

const EXCEPTION_KINDS = [
  { value: 'day_off',      label: 'Día libre' },
  { value: 'vacation',     label: 'Vacaciones' },
  { value: 'sick',         label: 'Enfermedad' },
  { value: 'permission',   label: 'Permiso personal' },
  { value: 'extra',        label: 'Trabaja en día libre (+35%)' },
  { value: 'holiday_work', label: 'Trabaja en feriado (+100%)' },
  { value: 'suspension',   label: 'Suspensión disciplinaria (sin goce)' },
  { value: 'maternity',    label: 'Licencia maternidad (14 semanas)' },
  { value: 'paternity',    label: 'Licencia paternidad (2 días)' },
];

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  d.setHours(0, 0, 0, 0);
  return d;
}
function fmt(dateStr: string) { const [, m, d] = dateStr.split('-'); return `${d}/${m}`; }

// ─── Modal: Asignar Horario ───────────────────────────────────────────────────

function AssignModal({ employee, templates, onClose, onSaved }: {
  employee: Employee; templates: Template[];
  onClose: () => void; onSaved: () => void;
}) {
  const [templateId, setTemplateId]       = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading]             = useState(false);

  const save = async () => {
    if (!templateId) { toast.error('Selecciona una plantilla'); return; }
    setLoading(true);
    try {
      const tpl = templates.find(t => t.id === templateId);
      await api.put(`/schedules/employee/${employee.id}`, {
        templateId, effectiveFrom, scheduleData: {}, weeklyHours: tpl?.weeklyHours,
      });
      toast.success(`Horario asignado a ${employee.firstName}`);
      onSaved();
    } catch { toast.error('Error al asignar horario'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
        <h2 className="text-lg font-semibold mb-1">Asignar Horario</h2>
        <p className="text-sm text-slate-500 mb-5">{employee.firstName} {employee.lastName}</p>
        <div className="space-y-3 mb-5">
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Plantilla</label>
            <select value={templateId} onChange={e => setTemplateId(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
              <option value="">Seleccionar...</option>
              {templates.map(t => <option key={t.id} value={t.id}>{t.name} ({t.weeklyHours}h/sem)</option>)}
            </select>
            <p className="text-xs text-slate-400 mt-1">
              ¿No existe?{' '}
              <Link href="/dashboard/schedules/plantillas" className="text-blue-600 hover:underline">Crea una nueva</Link>
            </p>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Vigente desde</label>
            <input type="date" value={effectiveFrom} onChange={e => setEffectiveFrom(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={save} disabled={loading}
            className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm disabled:opacity-50">
            {loading ? 'Guardando...' : 'Asignar Horario'}
          </button>
          <button onClick={onClose} className="flex-1 border border-slate-200 py-2 rounded-lg text-sm">Cancelar</button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal: Excepción ─────────────────────────────────────────────────────────

function ExceptionModal({ employee, onClose, onSaved }: {
  employee: Employee; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState({
    kind: 'day_off', dateFrom: new Date().toISOString().split('T')[0],
    dateTo: new Date().toISOString().split('T')[0], paid: true, notes: '',
  });
  const [loading, setLoading] = useState(false);
  const noPayKinds = ['suspension'];

  const save = async () => {
    setLoading(true);
    try {
      await api.post(`/schedules/employee/${employee.id}/exceptions`, {
        ...form,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        paid: noPayKinds.includes(form.kind) ? false : form.paid,
      });
      toast.success('Excepción registrada');
      onSaved();
    } catch { toast.error('Error al registrar'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
        <h2 className="text-lg font-semibold mb-1">Registrar Excepción</h2>
        <p className="text-sm text-slate-500 mb-4">{employee.firstName} {employee.lastName}</p>
        <div className="space-y-3 mb-4">
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Tipo</label>
            <select value={form.kind} onChange={e => setForm({ ...form, kind: e.target.value })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
              {EXCEPTION_KINDS.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
            </select>
          </div>
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
          {!noPayKinds.includes(form.kind) && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.paid} onChange={e => setForm({ ...form, paid: e.target.checked })} className="rounded" />
              <span className="text-sm text-slate-700">Con goce de sueldo</span>
            </label>
          )}
          {noPayKinds.includes(form.kind) && (
            <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">Sin goce de sueldo automáticamente</p>
          )}
          <input placeholder="Notas (opcional)" value={form.notes}
            onChange={e => setForm({ ...form, notes: e.target.value })}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div className="flex gap-2">
          <button onClick={save} disabled={loading}
            className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm disabled:opacity-50">
            {loading ? 'Guardando...' : 'Registrar'}
          </button>
          <button onClick={onClose} className="flex-1 border border-slate-200 py-2 rounded-lg text-sm">Cancelar</button>
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function SchedulesPage() {
  const [weekStart, setWeekStart] = useState<Date>(getMondayOfWeek(new Date()));
  const [rows, setRows]           = useState<EmployeeWeekRow[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [holidays, setHolidays]   = useState<Record<string, string>>({});
  const [loading, setLoading]     = useState(true);
  const [tab, setTab]             = useState<'list' | 'calendar'>('list');
  const [assignEmp, setAssignEmp]       = useState<Employee | null>(null);
  const [exceptionEmp, setExceptionEmp] = useState<Employee | null>(null);

  const weekDates: string[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d.toISOString().split('T')[0];
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const empRes = await api.get('/employees');
      setEmployees(empRes.data?.data ?? empRes.data ?? []);
    } catch { toast.error('Error cargando empleados'); }

    const ws = weekStart.toISOString().split('T')[0];
    try {
      const [weekRes, tplRes, holRes] = await Promise.all([
        api.get(`/schedules/weekly-view?weekStart=${ws}`),
        api.get('/schedules/templates'),
        api.get(`/schedules/holidays-for-week?weekStart=${ws}`),
      ]);
      setRows(weekRes.data?.data ?? weekRes.data ?? []);
      setTemplates(tplRes.data?.data ?? tplRes.data ?? []);
      setHolidays(holRes.data?.data ?? holRes.data ?? {});
    } catch { /* tablas vacías o primer acceso */ }
    setLoading(false);
  }, [weekStart]);

  useEffect(() => { load(); }, [load]);

  const prevWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d); };
  const nextWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d); };
  const goToday  = () => setWeekStart(getMondayOfWeek(new Date()));

  const todayStr  = new Date().toISOString().split('T')[0];
  const rowByEmp  = Object.fromEntries(rows.map(r => [r.employeeId, r]));
  const withoutSchedule = employees.filter(e => !rowByEmp[e.id]);

  return (
    <div>
      <PageHeader
        title="Horarios del Personal"
        description="Asigna y gestiona los turnos de todos tus empleados"
        action={
          <div className="flex gap-2">
            <Link href="/dashboard/schedules/vacaciones"
              className="flex items-center gap-2 border border-slate-200 text-slate-700 px-3 py-2 rounded-lg text-sm hover:bg-slate-50">
              Vacaciones
            </Link>
            <Link href="/dashboard/schedules/horario-negocio"
              className="flex items-center gap-2 border border-slate-200 text-slate-700 px-3 py-2 rounded-lg text-sm hover:bg-slate-50">
              <Settings size={15} /> Horario Negocio
            </Link>
            <Link href="/dashboard/schedules/plantillas"
              className="flex items-center gap-2 border border-slate-200 text-slate-700 px-3 py-2 rounded-lg text-sm hover:bg-slate-50">
              <Clock size={15} /> Plantillas
            </Link>
          </div>
        }
      />

      {/* Alerta: empleados sin horario */}
      {!loading && withoutSchedule.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle size={16} className="text-amber-600" />
            <span className="text-sm font-medium text-amber-800">
              {withoutSchedule.length} empleado{withoutSchedule.length > 1 ? 's' : ''} sin horario asignado
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {withoutSchedule.map(emp => (
              <button key={emp.id} onClick={() => setAssignEmp(emp)}
                className="flex items-center gap-1.5 bg-white border border-amber-200 text-amber-800 text-xs px-3 py-1.5 rounded-lg hover:bg-amber-100">
                <UserPlus size={12} />
                {emp.firstName} {emp.lastName}
                {emp.position && <span className="text-amber-500">· {emp.position}</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-slate-100 p-1 rounded-lg w-fit">
        {(['list', 'calendar'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors
              ${tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
            {t === 'list' ? 'Lista de empleados' : 'Calendario semanal'}
          </button>
        ))}
      </div>

      {/* ── LISTA ─────────────────────────────────────────────────────────── */}
      {tab === 'list' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="text-center py-12 text-slate-400">Cargando...</div>
          ) : employees.length === 0 ? (
            <div className="text-center py-12">
              <CalendarDays size={40} className="text-slate-200 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">No hay empleados registrados.</p>
              <Link href="/dashboard/employees" className="text-blue-600 text-sm hover:underline mt-1 inline-block">Ir a Empleados →</Link>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-5 py-3 font-medium text-slate-600">Empleado</th>
                  <th className="text-left px-5 py-3 font-medium text-slate-600">Horario asignado</th>
                  <th className="text-left px-5 py-3 font-medium text-slate-600">Horas/sem</th>
                  <th className="text-left px-5 py-3 font-medium text-slate-600">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => {
                  const row = rowByEmp[emp.id];
                  const workDays = row ? weekDates.filter(d => row.week?.[d]?.type === 'work').length : 0;
                  return (
                    <tr key={emp.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="px-5 py-3">
                        <div className="font-medium text-slate-800">{emp.firstName} {emp.lastName}</div>
                        {emp.position && <div className="text-xs text-slate-400">{emp.position}</div>}
                      </td>
                      <td className="px-5 py-3">
                        {row ? (
                          <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                            Activo — {workDays} días esta semana
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 text-xs px-2 py-1 rounded-full">Sin asignar</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-slate-700 font-medium">{row ? `${row.weeklyHours}h` : '—'}</span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => setAssignEmp(emp)}
                            className="flex items-center gap-1 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700">
                            <Pencil size={11} /> {row ? 'Cambiar' : 'Asignar'}
                          </button>
                          <button onClick={() => setExceptionEmp(emp)}
                            className="text-xs border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-50">
                            Excepción
                          </button>
                          {row && (
                            <Link href={`/dashboard/schedules/empleado/${emp.id}`}
                              className="text-xs border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-50">
                              Historial
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── CALENDARIO ────────────────────────────────────────────────────── */}
      {tab === 'calendar' && (
        <>
          <div className="flex items-center gap-3 mb-4">
            <button onClick={prevWeek} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50"><ChevronLeft size={16} /></button>
            <button onClick={goToday} className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">Hoy</button>
            <button onClick={nextWeek} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50"><ChevronRight size={16} /></button>
            <span className="font-medium text-slate-700 text-sm">{fmt(weekDates[0])} — {fmt(weekDates[6])}</span>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
            <table className="w-full text-sm min-w-[750px]">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-medium text-slate-600 w-44">Empleado</th>
                  {weekDates.map((d, i) => {
                    const holidayName = holidays[d];
                    const isToday = d === todayStr;
                    return (
                      <th key={d} className={`text-center px-2 py-2 font-medium
                        ${holidayName ? 'bg-pink-50' : isToday ? 'bg-blue-50' : ''}`}>
                        <div className={`text-xs ${holidayName ? 'text-pink-700' : isToday ? 'text-blue-700' : 'text-slate-600'}`}>
                          {DAYS_ES[i]}
                        </div>
                        <div className={`text-[11px] font-normal ${holidayName ? 'text-pink-600' : isToday ? 'text-blue-500' : 'text-slate-400'}`}>
                          {fmt(d)}
                        </div>
                        {holidayName && (
                          <div className="text-[10px] text-pink-500 font-normal truncate max-w-[70px] mx-auto" title={holidayName}>
                            🎉 {holidayName}
                          </div>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} className="text-center py-10 text-slate-400">Cargando...</td></tr>
                ) : employees.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-10 text-slate-400">No hay empleados</td></tr>
                ) : (
                  employees.map(emp => {
                    const row = rowByEmp[emp.id];
                    return (
                      <tr key={emp.id} className="border-b border-slate-100 hover:bg-slate-50/30">
                        <td className="px-4 py-2.5">
                          <div className="font-medium text-slate-800 text-xs">{emp.firstName} {emp.lastName}</div>
                          {row
                            ? <div className="text-[10px] text-blue-600">{row.weeklyHours}h/sem</div>
                            : <div className="text-[10px] text-orange-500">Sin horario</div>
                          }
                        </td>
                        {weekDates.map(d => {
                          const cell: DayCell = row?.week?.[d] ?? { type: 'off' };
                          const isHoliday = !!holidays[d];
                          const workingOnHoliday = isHoliday && cell.type === 'work';
                          return (
                            <td key={d} className={`text-center px-1 py-2 ${d === todayStr ? 'bg-blue-50/40' : ''} ${isHoliday && cell.type === 'off' ? 'bg-pink-50/30' : ''}`}>
                              <div className={`mx-auto rounded px-1 py-1 text-[10px] font-medium relative
                                ${CELL_BG[cell.type] ?? CELL_BG.off}
                                ${workingOnHoliday ? 'ring-1 ring-orange-400' : ''}`}>
                                {CELL_LABEL[cell.type] ?? cell.type}
                                {cell.type === 'work' && cell.blocks?.[0] && (
                                  <div className="font-normal leading-tight">{cell.blocks[0].start}–{cell.blocks[cell.blocks.length - 1].end}</div>
                                )}
                                {workingOnHoliday && <div className="text-orange-600">⚠</div>}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Leyenda */}
          <div className="mt-3 flex flex-wrap gap-3">
            {Object.entries(CELL_LABEL).map(([key, label]) => (
              <div key={key} className="flex items-center gap-1.5">
                <div className={`w-3 h-3 rounded ${CELL_BG[key]?.split(' ')[0]}`} />
                <span className="text-xs text-slate-500">{label}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-pink-50 ring-1 ring-pink-300" />
              <span className="text-xs text-slate-500">Feriado nacional</span>
            </div>
          </div>
        </>
      )}

      {assignEmp && (
        <AssignModal employee={assignEmp} templates={templates}
          onClose={() => setAssignEmp(null)} onSaved={() => { setAssignEmp(null); load(); }} />
      )}
      {exceptionEmp && (
        <ExceptionModal employee={exceptionEmp}
          onClose={() => setExceptionEmp(null)} onSaved={() => { setExceptionEmp(null); load(); }} />
      )}
    </div>
  );
}
