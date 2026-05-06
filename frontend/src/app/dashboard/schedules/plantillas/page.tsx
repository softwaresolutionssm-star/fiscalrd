'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Copy } from 'lucide-react';
import { useConfirm } from '@/components/ui/confirm-dialog';
import Link from 'next/link';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface DayBlock { start: string; end: string; }
interface DaySchedule { isWorking: boolean; blocks: DayBlock[]; }
interface WeekSchedule {
  monday: DaySchedule; tuesday: DaySchedule; wednesday: DaySchedule;
  thursday: DaySchedule; friday: DaySchedule; saturday: DaySchedule; sunday: DaySchedule;
}
interface Template { id: string; name: string; description?: string; weeklyHours?: number; scheduleData: WeekSchedule; }

const DAY_KEYS: (keyof WeekSchedule)[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_LABELS: Record<keyof WeekSchedule, string> = {
  monday: 'L', tuesday: 'M', wednesday: 'X', thursday: 'J', friday: 'V', saturday: 'S', sunday: 'D',
};

const EMPTY_WEEK: WeekSchedule = {
  monday: { isWorking: false, blocks: [] },
  tuesday: { isWorking: false, blocks: [] },
  wednesday: { isWorking: false, blocks: [] },
  thursday: { isWorking: false, blocks: [] },
  friday: { isWorking: false, blocks: [] },
  saturday: { isWorking: false, blocks: [] },
  sunday: { isWorking: false, blocks: [] },
};

// ─── Componente editor de semana ──────────────────────────────────────────────

function WeekEditor({ schedule, onChange }: { schedule: WeekSchedule; onChange: (s: WeekSchedule) => void }) {
  const updateDay = (day: keyof WeekSchedule, field: keyof DaySchedule, value: any) => {
    onChange({ ...schedule, [day]: { ...schedule[day], [field]: value } });
  };
  const updateBlock = (day: keyof WeekSchedule, idx: number, field: keyof DayBlock, value: string) => {
    const blocks = [...schedule[day].blocks];
    blocks[idx] = { ...blocks[idx], [field]: value };
    onChange({ ...schedule, [day]: { ...schedule[day], blocks } });
  };
  const addBlock = (day: keyof WeekSchedule) => {
    const blocks = [...schedule[day].blocks, { start: '08:00', end: '17:00' }];
    onChange({ ...schedule, [day]: { ...schedule[day], blocks } });
  };
  const removeBlock = (day: keyof WeekSchedule, idx: number) => {
    const blocks = schedule[day].blocks.filter((_, i) => i !== idx);
    onChange({ ...schedule, [day]: { ...schedule[day], blocks } });
  };

  return (
    <div className="space-y-2">
      {DAY_KEYS.map(day => (
        <div key={day} className="flex items-start gap-3 py-1.5 border-b border-slate-100 last:border-0">
          <div className="w-8 pt-1">
            <label className="flex flex-col items-center gap-1 cursor-pointer">
              <input type="checkbox" checked={schedule[day].isWorking}
                onChange={e => updateDay(day, 'isWorking', e.target.checked)} className="rounded" />
              <span className={`text-xs font-bold ${schedule[day].isWorking ? 'text-blue-600' : 'text-slate-400'}`}>
                {DAY_LABELS[day]}
              </span>
            </label>
          </div>

          <div className="flex-1">
            {schedule[day].isWorking ? (
              <div className="space-y-1">
                {schedule[day].blocks.map((block, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input type="time" value={block.start} onChange={e => updateBlock(day, idx, 'start', e.target.value)}
                      className="border border-slate-200 rounded px-2 py-1 text-xs" />
                    <span className="text-slate-400 text-xs">—</span>
                    <input type="time" value={block.end} onChange={e => updateBlock(day, idx, 'end', e.target.value)}
                      className="border border-slate-200 rounded px-2 py-1 text-xs" />
                    <button onClick={() => removeBlock(day, idx)} className="text-red-400 hover:text-red-600 p-0.5">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
                {schedule[day].blocks.length === 0 && (
                  <button onClick={() => addBlock(day)} className="text-xs text-blue-600 hover:underline">
                    + Agregar horario
                  </button>
                )}
                {schedule[day].blocks.length > 0 && (
                  <button onClick={() => addBlock(day)} className="text-xs text-slate-400 hover:text-slate-600 hover:underline">
                    + Bloque horario partido
                  </button>
                )}
              </div>
            ) : (
              <span className="text-xs text-slate-400 italic">No trabaja</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Modal de creación/edición ────────────────────────────────────────────────

function TemplateModal({ template, onClose, onSaved }: {
  template: Template | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(template?.name ?? '');
  const [description, setDescription] = useState(template?.description ?? '');
  const [weeklyHours, setWeeklyHours] = useState(String(template?.weeklyHours ?? ''));
  const [schedule, setSchedule] = useState<WeekSchedule>(template?.scheduleData ?? { ...EMPTY_WEEK });
  const [loading, setLoading] = useState(false);

  const save = async () => {
    if (!name.trim()) { toast.error('El nombre es requerido'); return; }
    setLoading(true);
    try {
      const payload = {
        name, description: description || undefined,
        weeklyHours: weeklyHours ? parseFloat(weeklyHours) : undefined,
        scheduleData: schedule,
      };
      if (template) {
        await api.put(`/schedules/templates/${template.id}`, payload);
      } else {
        await api.post('/schedules/templates', payload);
      }
      toast.success(template ? 'Plantilla actualizada' : 'Plantilla creada');
      onSaved();
    } catch { toast.error('Error al guardar plantilla'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4">{template ? 'Editar' : 'Nueva'} Plantilla</h2>
        <div className="space-y-3 mb-4">
          <input required placeholder="Nombre de la plantilla *" value={name}
            onChange={e => setName(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Descripción (opcional)" value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          <input type="number" step="0.5" placeholder="Horas semanales" value={weeklyHours}
            onChange={e => setWeeklyHours(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
        </div>

        <div className="border border-slate-200 rounded-lg p-3 mb-4">
          <p className="text-xs font-medium text-slate-600 mb-2">Horario semanal</p>
          <WeekEditor schedule={schedule} onChange={setSchedule} />
        </div>

        <div className="flex gap-2">
          <button onClick={save} disabled={loading}
            className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm disabled:opacity-50">
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
          <button onClick={onClose} className="flex-1 border border-slate-200 py-2 rounded-lg text-sm">Cancelar</button>
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

function templateSummary(tpl: Template): string {
  const workDays = DAY_KEYS.filter(d => tpl.scheduleData[d]?.isWorking);
  if (workDays.length === 0) return 'Sin días de trabajo';
  const labels = workDays.map(d => DAY_LABELS[d]).join('');
  const first = tpl.scheduleData[workDays[0]];
  const timeStr = first?.blocks?.[0]
    ? `${first.blocks[0].start}-${first.blocks[first.blocks.length - 1].end}`
    : '';
  return `${labels} ${timeStr}`;
}

export default function PlantillasPage() {
  const confirm = useConfirm();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get('/schedules/templates');
      setTemplates(r.data?.data ?? r.data ?? []);
    } catch { toast.error('Error cargando plantillas'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const duplicate = async (tpl: Template) => {
    try {
      await api.post('/schedules/templates', {
        name: `${tpl.name} (copia)`,
        description: tpl.description,
        weeklyHours: tpl.weeklyHours,
        scheduleData: tpl.scheduleData,
      });
      toast.success('Plantilla duplicada');
      load();
    } catch { toast.error('Error al duplicar'); }
  };

  const remove = async (id: string) => {
    if (!await confirm({ title: 'Eliminar plantilla', message: '¿Eliminar esta plantilla de horario?', confirmText: 'Eliminar' })) return;
    try {
      await api.delete(`/schedules/templates/${id}`);
      toast.success('Eliminada');
      load();
    } catch { toast.error('Error al eliminar'); }
  };

  return (
    <div>
      <PageHeader
        title="Plantillas de Horario"
        description="Modelos reutilizables de horarios semanales"
        action={
          <div className="flex gap-2">
            <Link href="/dashboard/schedules" className="text-sm text-blue-600 hover:underline self-center">
              ← Volver
            </Link>
            <button onClick={() => { setEditing(null); setShowModal(true); }}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
              <Plus size={16} /> Nueva Plantilla
            </button>
          </div>
        }
      />

      {loading ? (
        <div className="text-center py-12 text-slate-400">Cargando...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map(tpl => (
            <div key={tpl.id} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-slate-800">{tpl.name}</h3>
                  {tpl.description && <p className="text-xs text-slate-500 mt-0.5">{tpl.description}</p>}
                </div>
                {tpl.weeklyHours && (
                  <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                    {tpl.weeklyHours}h/sem
                  </span>
                )}
              </div>

              {/* Resumen visual de días */}
              <div className="flex gap-1 mb-3">
                {DAY_KEYS.map(day => (
                  <div key={day} className={`w-7 h-7 rounded flex items-center justify-center text-xs font-bold
                    ${tpl.scheduleData[day]?.isWorking ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                    {DAY_LABELS[day]}
                  </div>
                ))}
              </div>

              <p className="text-xs text-slate-500 mb-3">{templateSummary(tpl)}</p>

              <div className="flex gap-2">
                <button onClick={() => { setEditing(tpl); setShowModal(true); }}
                  className="flex items-center gap-1 text-xs text-slate-600 border border-slate-200 px-2 py-1 rounded hover:bg-slate-50">
                  <Pencil size={12} /> Editar
                </button>
                <button onClick={() => duplicate(tpl)}
                  className="flex items-center gap-1 text-xs text-slate-600 border border-slate-200 px-2 py-1 rounded hover:bg-slate-50">
                  <Copy size={12} /> Duplicar
                </button>
                <button onClick={() => remove(tpl.id)}
                  className="flex items-center gap-1 text-xs text-red-500 border border-red-100 px-2 py-1 rounded hover:bg-red-50 ml-auto">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <TemplateModal
          template={editing}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); }}
        />
      )}
    </div>
  );
}
