'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Save, Plus, Trash2 } from 'lucide-react';
import { useConfirm } from '@/components/ui/confirm-dialog';
import Link from 'next/link';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface BusinessHour {
  id?: string;
  dayOfWeek: number;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  hasBreak: boolean;
  breakStart?: string;
  breakEnd?: string;
  is24Hours: boolean;
}

interface BusinessException {
  id: string;
  date: string;
  isClosed: boolean;
  openTime?: string;
  closeTime?: string;
  reason?: string;
  type: string;
  isNational: boolean;
}

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const EXCEPTION_TYPE_LABELS: Record<string, string> = {
  holiday: 'Feriado',
  closure: 'Cierre especial',
  special: 'Horario especial',
};

export default function HorarioNegocioPage() {
  const confirm = useConfirm();
  const [hours, setHours] = useState<BusinessHour[]>([]);
  const [exceptions, setExceptions] = useState<BusinessException[]>([]);
  const [savingHours, setSavingHours] = useState(false);
  const [year] = useState(new Date().getFullYear());
  const [showExcForm, setShowExcForm] = useState(false);
  const [excForm, setExcForm] = useState({
    date: '', isClosed: true, openTime: '', closeTime: '', reason: '', type: 'closure',
  });

  const load = async () => {
    try {
      const [hoursRes, excRes] = await Promise.all([
        api.get('/schedules/business-hours'),
        api.get(`/schedules/business-exceptions?year=${year}`),
      ]);
      // Ordenar lunes primero (1-6, luego 0)
      const hoursArr: BusinessHour[] = hoursRes.data?.data ?? hoursRes.data ?? [];
      const sorted = hoursArr.sort((a, b) => {
        const ai = a.dayOfWeek === 0 ? 7 : a.dayOfWeek;
        const bi = b.dayOfWeek === 0 ? 7 : b.dayOfWeek;
        return ai - bi;
      });
      setHours(sorted);
      setExceptions(excRes.data?.data ?? excRes.data ?? []);
    } catch { toast.error('Error cargando horarios'); }
  };

  useEffect(() => { load(); }, []);

  const updateDay = (dayOfWeek: number, field: keyof BusinessHour, value: any) => {
    setHours(prev => prev.map(h => h.dayOfWeek === dayOfWeek ? { ...h, [field]: value } : h));
  };

  const saveHours = async () => {
    setSavingHours(true);
    try {
      await api.put('/schedules/business-hours', hours);
      toast.success('Horario guardado');
    } catch { toast.error('Error al guardar'); }
    finally { setSavingHours(false); }
  };

  const saveException = async () => {
    if (!excForm.date) { toast.error('Indica la fecha'); return; }
    try {
      await api.post('/schedules/business-exceptions', excForm);
      toast.success('Excepción guardada');
      setShowExcForm(false);
      setExcForm({ date: '', isClosed: true, openTime: '', closeTime: '', reason: '', type: 'closure' });
      load();
    } catch { toast.error('Error al guardar excepción'); }
  };

  const deleteException = async (id: string) => {
    if (!await confirm({ title: 'Eliminar excepción', message: '¿Eliminar esta excepción del horario?', confirmText: 'Eliminar' })) return;
    try {
      await api.delete(`/schedules/business-exceptions/${id}`);
      toast.success('Eliminada');
      load();
    } catch { toast.error('Error'); }
  };

  return (
    <div>
      <PageHeader
        title="Horario del Negocio"
        description="Configura los días y horarios de apertura del negocio"
        action={
          <Link href="/dashboard/schedules" className="text-sm text-blue-600 hover:underline">
            ← Volver a Horarios
          </Link>
        }
      />

      {/* Horario semanal */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-800">Horario Semanal</h2>
          <button onClick={saveHours} disabled={savingHours}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
            <Save size={15} /> {savingHours ? 'Guardando...' : 'Guardar'}
          </button>
        </div>

        <div className="space-y-3">
          {hours.map(h => (
            <div key={h.dayOfWeek} className="flex flex-wrap items-center gap-3 py-2 border-b border-slate-100 last:border-0">
              <div className="w-24">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={h.isOpen} onChange={e => updateDay(h.dayOfWeek, 'isOpen', e.target.checked)}
                    className="rounded" />
                  <span className={`text-sm font-medium ${h.isOpen ? 'text-slate-800' : 'text-slate-400'}`}>
                    {DAY_NAMES[h.dayOfWeek]}
                  </span>
                </label>
              </div>

              {h.isOpen && (
                <>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={h.is24Hours} onChange={e => updateDay(h.dayOfWeek, 'is24Hours', e.target.checked)}
                      className="rounded" />
                    24h
                  </label>

                  {!h.is24Hours && (
                    <>
                      <input type="time" value={h.openTime} onChange={e => updateDay(h.dayOfWeek, 'openTime', e.target.value)}
                        className="border border-slate-200 rounded-lg px-2 py-1 text-sm" />
                      <span className="text-slate-400 text-sm">—</span>
                      <input type="time" value={h.closeTime} onChange={e => updateDay(h.dayOfWeek, 'closeTime', e.target.value)}
                        className="border border-slate-200 rounded-lg px-2 py-1 text-sm" />

                      <label className="flex items-center gap-1.5 text-sm cursor-pointer ml-2">
                        <input type="checkbox" checked={h.hasBreak} onChange={e => updateDay(h.dayOfWeek, 'hasBreak', e.target.checked)}
                          className="rounded" />
                        Almuerzo
                      </label>

                      {h.hasBreak && (
                        <>
                          <input type="time" value={h.breakStart ?? ''} onChange={e => updateDay(h.dayOfWeek, 'breakStart', e.target.value)}
                            className="border border-slate-200 rounded-lg px-2 py-1 text-sm" />
                          <span className="text-slate-400 text-sm">—</span>
                          <input type="time" value={h.breakEnd ?? ''} onChange={e => updateDay(h.dayOfWeek, 'breakEnd', e.target.value)}
                            className="border border-slate-200 rounded-lg px-2 py-1 text-sm" />
                        </>
                      )}
                    </>
                  )}
                </>
              )}

              {!h.isOpen && (
                <span className="text-sm text-slate-400 italic">Cerrado</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Excepciones / Feriados */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-slate-800">Feriados y Cierres Especiales</h2>
            <p className="text-xs text-slate-500 mt-0.5">Feriados nacionales de RD precargados — puedes agregar cierres propios</p>
          </div>
          <button onClick={() => setShowExcForm(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700">
            <Plus size={15} /> Agregar
          </button>
        </div>

        {showExcForm && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Fecha</label>
                <input type="date" value={excForm.date} onChange={e => setExcForm({ ...excForm, date: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Tipo</label>
                <select value={excForm.type} onChange={e => setExcForm({ ...excForm, type: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                  <option value="closure">Cierre especial</option>
                  <option value="special">Horario especial</option>
                </select>
              </div>
            </div>
            <input placeholder="Motivo (ej. Inventario anual)" value={excForm.reason}
              onChange={e => setExcForm({ ...excForm, reason: e.target.value })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={excForm.isClosed} onChange={e => setExcForm({ ...excForm, isClosed: e.target.checked })}
                className="rounded" />
              <span className="text-sm">Cerrado ese día</span>
            </label>
            {!excForm.isClosed && (
              <div className="flex items-center gap-2">
                <input type="time" value={excForm.openTime} onChange={e => setExcForm({ ...excForm, openTime: e.target.value })}
                  className="border border-slate-200 rounded-lg px-2 py-2 text-sm" />
                <span className="text-slate-400">—</span>
                <input type="time" value={excForm.closeTime} onChange={e => setExcForm({ ...excForm, closeTime: e.target.value })}
                  className="border border-slate-200 rounded-lg px-2 py-2 text-sm" />
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={saveException} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">Guardar</button>
              <button onClick={() => setShowExcForm(false)} className="border border-slate-200 px-4 py-2 rounded-lg text-sm">Cancelar</button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {exceptions.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No hay excepciones para {year}</p>}
          {exceptions.map(exc => (
            <div key={exc.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${exc.isNational ? 'bg-blue-500' : 'bg-orange-500'}`} />
                <div>
                  <div className="text-sm font-medium text-slate-800">
                    {exc.date} — {exc.reason || 'Sin motivo'}
                  </div>
                  <div className="text-xs text-slate-500 flex gap-2">
                    <span>{EXCEPTION_TYPE_LABELS[exc.type] ?? exc.type}</span>
                    {exc.isClosed ? <span className="text-red-500">Cerrado</span> : <span className="text-green-600">Abierto {exc.openTime}-{exc.closeTime}</span>}
                    {exc.isNational && <span className="text-blue-500">Nacional</span>}
                  </div>
                </div>
              </div>
              {!exc.isNational && (
                <button onClick={() => deleteException(exc.id)} className="text-red-500 hover:text-red-700 p-1">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
