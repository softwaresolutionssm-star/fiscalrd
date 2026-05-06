'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Plus, CheckCircle, DollarSign, Download, Trash2, Mail, Calculator, ChevronDown, ChevronUp } from 'lucide-react';
import { BranchBadge } from '@/components/ui/branch-badge';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { formatCurrency } from '@/lib/utils';

interface Employee { id: string; firstName: string; lastName: string; salary: number; }
const FREQ_LABEL: Record<string, string> = { WEEKLY: 'Semanal', BIWEEKLY: 'Quincenal', MONTHLY: 'Mensual' };

function fmtDate(d: string | null | undefined) {
  if (!d) return '';
  const [y, m, day] = String(d).split('T')[0].split('-').map(Number);
  return new Date(y, m - 1, day).toLocaleDateString('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function periodDisplay(p: Payroll) {
  if (p.periodStart && p.periodEnd) {
    return `${fmtDate(String(p.periodStart))} – ${fmtDate(String(p.periodEnd))}`;
  }
  // monthly fallback: "Marzo 2026"
  const [year, month] = p.period.split('-');
  const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  return `${months[parseInt(month) - 1]} ${year}`;
}

interface Payroll {
  id: string; employeeId: string; period: string; frequency: string;
  periodStart?: string; periodEnd?: string;
  grossSalary: number; sfsEmployee: number; afpEmployee: number; isr: number; netSalary: number; status: string;
}

const statusLabel: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Borrador', color: 'bg-slate-100 text-slate-600' },
  APPROVED: { label: 'Aprobada', color: 'bg-blue-100 text-blue-700' },
  PAID: { label: 'Pagada', color: 'bg-green-100 text-green-700' },
};

export default function PayrollPage() {
  const confirm = useConfirm();
  const [items, setItems] = useState<Payroll[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showPrestaciones, setShowPrestaciones] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [prestacionesResult, setPrestacionesResult] = useState<any>(null);
  const [prestacionesForm, setPrestacionesForm] = useState({ employeeId: '', yearsOfService: '', lastSalary: '' });
  const [form, setForm] = useState({
    employeeId: '', period: new Date().toISOString().slice(0, 7), frequency: 'MONTHLY',
    periodStart: '', periodEnd: '', baseSalary: '', overtime: '0', bonuses: '0', commission: '0',
    type: 'REGULAR',
    overtimeHoursDiurnas: '0', overtimeHoursNocturnas: '0', overtimeHoursFeriados: '0',
  });

  const load = () => {
    api.get('/payroll').then(r => setItems(r.data.data ?? [])).catch(() => {});
    api.get('/employees').then(r => setEmployees(r.data.data ?? [])).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const handlePreview = async () => {
    if (!form.baseSalary) return;
    try {
      const r = await api.post('/payroll/preview', {
        employeeId: form.employeeId || 'preview',
        period: form.period,
        type: form.type,
        baseSalary: parseFloat(form.baseSalary),
        overtime: parseFloat(form.overtime) || 0,
        bonuses: parseFloat(form.bonuses) || 0,
        commission: parseFloat(form.commission) || 0,
        overtimeHoursDiurnas: parseFloat(form.overtimeHoursDiurnas) || 0,
        overtimeHoursNocturnas: parseFloat(form.overtimeHoursNocturnas) || 0,
        overtimeHoursFeriados: parseFloat(form.overtimeHoursFeriados) || 0,
      });
      setPreview(r.data.data);
    } catch { toast.error('Error al calcular'); }
  };

  const calcPrestaciones = async () => {
    if (!prestacionesForm.yearsOfService || !prestacionesForm.lastSalary) return;
    try {
      const params = new URLSearchParams({
        employeeId: prestacionesForm.employeeId || 'calc',
        yearsOfService: prestacionesForm.yearsOfService,
        lastSalary: prestacionesForm.lastSalary,
      });
      const r = await api.get(`/payroll/calculate/prestaciones?${params}`);
      setPrestacionesResult(r.data.data ?? r.data);
    } catch { toast.error('Error al calcular'); }
  };

  const autoFillRegalia = async (employeeId: string) => {
    if (!employeeId) return;
    try {
      const year = new Date().getFullYear();
      const r = await api.get(`/payroll/regalia-pascual/${employeeId}?year=${year}`);
      const data = r.data.data ?? r.data;
      setForm(f => ({ ...f, baseSalary: String(data.regaliaPascual ?? ''), overtime: '0', bonuses: '0', commission: '0' }));
      toast.success(`Regalía calculada: salario promedio últimos 12 meses`);
    } catch { /* no-op, user fills manually */ }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/payroll', {
        ...form,
        type: form.type,
        baseSalary: parseFloat(form.baseSalary),
        overtime: parseFloat(form.overtime) || 0,
        bonuses: parseFloat(form.bonuses) || 0,
        commission: parseFloat(form.commission) || 0,
        overtimeHoursDiurnas: parseFloat(form.overtimeHoursDiurnas) || 0,
        overtimeHoursNocturnas: parseFloat(form.overtimeHoursNocturnas) || 0,
        overtimeHoursFeriados: parseFloat(form.overtimeHoursFeriados) || 0,
      });
      toast.success('Nómina creada');
      setShowForm(false); setPreview(null); load();
    } catch (err: any) { toast.error(err.response?.data?.message ?? 'Error'); }
  };

  const approve = async (id: string) => { await api.patch(`/payroll/${id}/approve`); toast.success('Aprobada'); load(); };
  const markPaid = async (id: string) => { await api.patch(`/payroll/${id}/pay`); toast.success('Marcada como pagada'); load(); };

  const sendEmail = async (id: string) => {
    try {
      const r = await api.post(`/payroll/${id}/send-email`, {});
      toast.success(r.data.message ?? 'Recibo enviado');
    } catch (err: any) {
      const msg = err.response?.data?.message ?? 'Error al enviar';
      // If no email on employee, prompt for one
      if (msg.includes('no tiene email')) {
        const email = prompt('El empleado no tiene email. Introduce un email destino:');
        if (email) {
          try {
            const r2 = await api.post(`/payroll/${id}/send-email`, { email });
            toast.success(r2.data.message ?? 'Recibo enviado');
          } catch { toast.error('Error al enviar'); }
        }
      } else {
        toast.error(msg);
      }
    }
  };

  const remove = async (id: string) => {
    if (!await confirm({ title: 'Eliminar nómina', message: '¿Eliminar esta nómina en borrador? Esta acción no se puede deshacer.', confirmText: 'Eliminar' })) return;
    try { await api.delete(`/payroll/${id}`); toast.success('Nómina eliminada'); load(); }
    catch { toast.error('Error al eliminar'); }
  };

  const exportAch = async () => {
    const period = form.period || new Date().toISOString().slice(0, 7);
    try {
      const r = await api.get(`/payroll/export/ach?period=${period}`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([r.data], { type: 'text/csv' }));
      const a = document.createElement('a'); a.href = url; a.download = `nomina-ach-${period}.csv`; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Error al exportar'); }
  };

  const downloadTss = async () => {
    try {
      const period = form.period || new Date().toISOString().slice(0, 7);
      const r = await api.get(`/payroll/export/tss?period=${period}`, { responseType: 'blob' });
      const url = URL.createObjectURL(r.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `TSS-${period}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Error al exportar TSS');
    }
  };

  const employeeName = (id: string) => { const e = employees.find(e => e.id === id); return e ? `${e.firstName} ${e.lastName}` : id; };

  return (
    <div>
      <PageHeader title="Nómina" description="Gestión de pagos de empleados" action={
        <div className="flex gap-2">
          <button onClick={exportAch} className="flex items-center gap-2 border border-slate-200 bg-white text-slate-600 px-4 py-2 rounded-lg text-sm hover:bg-slate-50"><Download size={15} /> Exportar ACH</button>
          <button onClick={downloadTss} className="flex items-center gap-2 border border-slate-200 bg-white text-slate-600 px-4 py-2 rounded-lg text-sm hover:bg-slate-50"><Download size={15} /> Exportar TSS</button>
          <button onClick={() => setShowPrestaciones(v => !v)} className="flex items-center gap-2 border border-slate-200 bg-white text-slate-600 px-4 py-2 rounded-lg text-sm hover:bg-slate-50"><Calculator size={15} /> Prestaciones</button>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"><Plus size={16} /> Nueva Nómina</button>
        </div>
      } />

      {showForm && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-700">Nueva Nómina</h2>
            <BranchBadge />
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-3 gap-4">
            <div><label className="block text-sm font-medium text-slate-600 mb-1">Tipo de Nómina</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.type}
                onChange={e => {
                  setForm({ ...form, type: e.target.value });
                  if (e.target.value === 'REGALIA_PASCUAL' && form.employeeId) autoFillRegalia(form.employeeId);
                }}>
                <option value="REGULAR">Regular</option>
                <option value="REGALIA_PASCUAL">🎄 Regalía Navideña</option>
              </select>
              {form.type === 'REGALIA_PASCUAL' && (
                <p className="text-xs text-green-700 mt-1">Exenta de SFS/AFP/SRL — Art. 219 Código Laboral</p>
              )}
            </div>
            <div><label className="block text-sm font-medium text-slate-600 mb-1">Empleado *</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.employeeId}
                onChange={e => {
                  const emp = employees.find(em => em.id === e.target.value);
                  setForm({ ...form, employeeId: e.target.value, baseSalary: emp ? String(emp.salary) : form.baseSalary });
                  if (form.type === 'REGALIA_PASCUAL' && e.target.value) autoFillRegalia(e.target.value);
                }} required>
                <option value="">Seleccionar...</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
              </select>
            </div>
            <div><label className="block text-sm font-medium text-slate-600 mb-1">Período *</label><input type="month" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.period} onChange={e => setForm({ ...form, period: e.target.value })} required /></div>
            <div><label className="block text-sm font-medium text-slate-600 mb-1">Frecuencia de Pago</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value, periodStart: '', periodEnd: '' })}>
                <option value="MONTHLY">Mensual</option>
                <option value="BIWEEKLY">Quincenal</option>
                <option value="WEEKLY">Semanal</option>
              </select>
            </div>
            {form.frequency !== 'MONTHLY' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">
                    {form.frequency === 'BIWEEKLY' ? 'Inicio de quincena (día 1 o 16) *' : 'Cualquier día de la semana *'}
                  </label>
                  <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.periodStart}
                    onChange={e => {
                      // Usar constructor multi-argumento para evitar problemas de timezone
                      const [y, mo, d] = e.target.value.split('-').map(Number);
                      const picked = new Date(y, mo - 1, d); // hora local, sin UTC
                      const toStr = (dt: Date) => {
                        const yy = dt.getFullYear();
                        const mm = String(dt.getMonth() + 1).padStart(2, '0');
                        const dd = String(dt.getDate()).padStart(2, '0');
                        return `${yy}-${mm}-${dd}`;
                      };
                      let start: Date;
                      let end: Date;
                      if (form.frequency === 'WEEKLY') {
                        const dow = picked.getDay(); // 0=Dom, 1=Lun ... 6=Sab
                        const diffToMonday = dow === 0 ? -6 : 1 - dow;
                        start = new Date(y, mo - 1, d + diffToMonday);
                        end   = new Date(y, mo - 1, d + diffToMonday + 6);
                      } else {
                        // Quincenal: 1-15 o 16-fin de mes
                        if (d <= 15) {
                          start = new Date(y, mo - 1, 1);
                          end   = new Date(y, mo - 1, 15);
                        } else {
                          start = new Date(y, mo - 1, 16);
                          end   = new Date(y, mo, 0); // día 0 del mes siguiente = último día del mes
                        }
                      }
                      setForm({ ...form, periodStart: toStr(start), periodEnd: toStr(end), period: toStr(start).slice(0, 7) });
                    }} required />
                  {form.frequency === 'WEEKLY' && form.periodStart && (
                    <p className="text-xs text-blue-600 mt-1">
                      Semana: Lun {fmtDate(form.periodStart)} — Dom {fmtDate(form.periodEnd)}
                    </p>
                  )}
                  {form.frequency === 'BIWEEKLY' && form.periodStart && (
                    <p className="text-xs text-blue-600 mt-1">
                      Quincena: {fmtDate(form.periodStart)} — {fmtDate(form.periodEnd)}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Fecha fin (calculada)</label>
                  <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm bg-slate-50" value={form.periodEnd}
                    onChange={e => setForm({ ...form, periodEnd: e.target.value })} />
                  <p className="text-xs text-slate-400 mt-1">Ajustable si es necesario</p>
                </div>
              </>
            )}
            <div><label className="block text-sm font-medium text-slate-600 mb-1">Salario Base *</label><input type="number" step="0.01" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.baseSalary} onChange={e => setForm({ ...form, baseSalary: e.target.value })} required /></div>
            <div><label className="block text-sm font-medium text-slate-600 mb-1">Bonificaciones</label><input type="number" step="0.01" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.bonuses} onChange={e => setForm({ ...form, bonuses: e.target.value })} /></div>
            <div><label className="block text-sm font-medium text-slate-600 mb-1">Comisiones</label><input type="number" step="0.01" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.commission} onChange={e => setForm({ ...form, commission: e.target.value })} /></div>

            {/* ── Horas Extras por tipo (Código Laboral RD) ── */}
            <div className="col-span-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Horas Extras (Art. 203 Código Laboral)</p>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Hs. Diurnas (35% recargo)</label>
                  <input type="number" step="0.5" min="0" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.overtimeHoursDiurnas}
                    onChange={e => setForm({ ...form, overtimeHoursDiurnas: e.target.value, overtime: '0' })} placeholder="0" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Hs. Nocturnas (15% recargo)</label>
                  <input type="number" step="0.5" min="0" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.overtimeHoursNocturnas}
                    onChange={e => setForm({ ...form, overtimeHoursNocturnas: e.target.value, overtime: '0' })} placeholder="0" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Hs. Feriados (100% recargo)</label>
                  <input type="number" step="0.5" min="0" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.overtimeHoursFeriados}
                    onChange={e => setForm({ ...form, overtimeHoursFeriados: e.target.value, overtime: '0' })} placeholder="0" />
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-1">Si ingresas horas, el monto de horas extras se auto-calcula. O ingresa un monto fijo abajo.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Horas Extras (monto fijo)</label>
              <input type="number" step="0.01" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.overtime}
                onChange={e => setForm({ ...form, overtime: e.target.value, overtimeHoursDiurnas: '0', overtimeHoursNocturnas: '0', overtimeHoursFeriados: '0' })}
                placeholder="Solo si no usas horas arriba" />
            </div>

            {preview && (
              <div className="col-span-3 bg-slate-50 rounded-lg p-4 text-sm space-y-2">
                {preview.note && <p className="text-xs text-green-700 font-medium">ℹ {preview.note}</p>}
                {preview.overtimeBreakdown && (
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs space-y-1">
                    <p className="font-semibold text-blue-700 mb-1">Desglose de Horas Extras</p>
                    {preview.overtimeBreakdown.diurnasAmt > 0 && <div className="flex justify-between"><span className="text-slate-500">Diurnas ({preview.overtimeBreakdown.diurnasHours}h × 1.35):</span><span>{formatCurrency(preview.overtimeBreakdown.diurnasAmt)}</span></div>}
                    {preview.overtimeBreakdown.nocturnasAmt > 0 && <div className="flex justify-between"><span className="text-slate-500">Nocturnas ({preview.overtimeBreakdown.nocturnasHours}h × 1.15):</span><span>{formatCurrency(preview.overtimeBreakdown.nocturnasAmt)}</span></div>}
                    {preview.overtimeBreakdown.feriadosAmt > 0 && <div className="flex justify-between"><span className="text-slate-500">Feriados ({preview.overtimeBreakdown.feriadosHours}h × 2.0):</span><span>{formatCurrency(preview.overtimeBreakdown.feriadosAmt)}</span></div>}
                    <div className="flex justify-between border-t border-blue-100 pt-1 font-semibold"><span>Total H.E.:</span><span>{formatCurrency(preview.overtimeBreakdown.overtimeAmount)}</span></div>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex justify-between"><span className="text-slate-500">Salario Bruto:</span><span className="font-medium">{formatCurrency(preview.grossSalary)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">SFS (3.04%):</span><span className={preview.sfsEmployee === 0 ? 'text-slate-400 line-through' : 'text-red-600'}>-{formatCurrency(preview.sfsEmployee)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">AFP (2.87%):</span><span className={preview.afpEmployee === 0 ? 'text-slate-400 line-through' : 'text-red-600'}>-{formatCurrency(preview.afpEmployee)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">ISR:</span><span className="text-red-600">-{formatCurrency(preview.isr)}</span></div>
                  <div className="flex justify-between col-span-2 border-t pt-2"><span className="font-semibold">Salario Neto:</span><span className="font-bold text-green-700">{formatCurrency(preview.netSalary)}</span></div>
                </div>
              </div>
            )}

            <div className="col-span-3 flex gap-2 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-slate-50">Cancelar</button>
              <button type="button" onClick={handlePreview} className="px-4 py-2 text-sm bg-slate-700 text-white rounded-lg hover:bg-slate-800">Calcular</button>
              <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Crear Nómina</button>
            </div>
          </form>
        </div>
      )}

      {/* ── Calculadora de Prestaciones & Vacaciones ── */}
      {showPrestaciones && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-700 flex items-center gap-2"><Calculator size={16} /> Calculadora de Prestaciones & Vacaciones</h2>
            <button onClick={() => setShowPrestaciones(false)} className="text-slate-400 hover:text-slate-600 text-sm">Cerrar</button>
          </div>
          <p className="text-xs text-slate-500 mb-4">Art. 76-80 (preaviso), Art. 224 (cesantía), Art. 177-178 (vacaciones), Art. 219 (regalía proporcional) — Código Laboral RD</p>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Empleado</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm" value={prestacionesForm.employeeId}
                onChange={e => {
                  const emp = employees.find(em => em.id === e.target.value);
                  setPrestacionesForm(f => ({ ...f, employeeId: e.target.value, lastSalary: emp ? String(emp.salary) : f.lastSalary }));
                }}>
                <option value="">Seleccionar (opcional)...</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Años de Servicio *</label>
              <input type="number" step="0.5" min="0" className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="3.5" value={prestacionesForm.yearsOfService}
                onChange={e => setPrestacionesForm(f => ({ ...f, yearsOfService: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Último Salario *</label>
              <input type="number" step="0.01" min="0" className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="25000.00" value={prestacionesForm.lastSalary}
                onChange={e => setPrestacionesForm(f => ({ ...f, lastSalary: e.target.value }))} />
            </div>
          </div>
          <button onClick={calcPrestaciones} className="px-4 py-2 text-sm bg-slate-700 text-white rounded-lg hover:bg-slate-800 mb-4">Calcular Prestaciones</button>

          {prestacionesResult && (
            <div className="bg-slate-50 rounded-lg p-4 text-sm space-y-1.5 max-w-lg">
              <p className="font-semibold text-slate-700 mb-2">Desglose</p>
              <div className="flex justify-between"><span className="text-slate-500">Preaviso ({prestacionesResult.preaviso?.days} días, Art. 76):</span><span className="font-medium">{formatCurrency(prestacionesResult.preaviso?.amount)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Cesantía ({prestacionesResult.cesantia?.days} días, Art. 224):</span><span className="font-medium">{formatCurrency(prestacionesResult.cesantia?.amount)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Vacaciones ({prestacionesResult.vacaciones?.days} días, Art. 177):</span><span className="font-medium">{formatCurrency(prestacionesResult.vacaciones?.amount)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Regalía Proporcional (Art. 219):</span><span className="font-medium">{formatCurrency(prestacionesResult.regaliaProporcional)}</span></div>
              <div className="flex justify-between border-t border-slate-200 pt-2 mt-2 font-bold text-base"><span>TOTAL:</span><span className="text-blue-700">{formatCurrency(prestacionesResult.total)}</span></div>
              <p className="text-xs text-slate-400 pt-1">Salario diario: {formatCurrency(prestacionesResult.lastSalary / 30)} · {prestacionesResult.yearsOfService < 5 ? '<5 años → vacaciones 14 días' : '≥5 años → vacaciones 18 días'}</p>
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-100"><tr>
            <th className="text-left px-4 py-3 text-slate-600 font-medium">Empleado</th>
            <th className="text-left px-4 py-3 text-slate-600 font-medium">Período</th>
            <th className="text-left px-4 py-3 text-slate-600 font-medium">Frecuencia</th>
            <th className="text-right px-4 py-3 text-slate-600 font-medium">Bruto</th>
            <th className="text-right px-4 py-3 text-slate-600 font-medium">SFS</th>
            <th className="text-right px-4 py-3 text-slate-600 font-medium">AFP</th>
            <th className="text-right px-4 py-3 text-slate-600 font-medium">ISR</th>
            <th className="text-right px-4 py-3 text-slate-600 font-medium">Neto</th>
            <th className="text-center px-4 py-3 text-slate-600 font-medium">Estado</th>
            <th className="text-right px-4 py-3 text-slate-600 font-medium">Acciones</th>
          </tr></thead>
          <tbody>
            {items.length === 0 && <tr><td colSpan={10} className="text-center py-8 text-slate-400">No hay nóminas registradas</td></tr>}
            {items.map(p => {
              const st = statusLabel[p.status] ?? { label: p.status, color: 'bg-slate-100 text-slate-600' };
              return (
                <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-700">{employeeName(p.employeeId)}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{periodDisplay(p)}</td>
                  <td className="px-4 py-3 text-slate-500">{FREQ_LABEL[p.frequency] ?? 'Mensual'}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(p.grossSalary)}</td>
                  <td className="px-4 py-3 text-right text-red-500">{formatCurrency(p.sfsEmployee)}</td>
                  <td className="px-4 py-3 text-right text-red-500">{formatCurrency(p.afpEmployee)}</td>
                  <td className="px-4 py-3 text-right text-red-500">{formatCurrency(p.isr)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-green-700">{formatCurrency(p.netSalary)}</td>
                  <td className="px-4 py-3 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>{st.label}</span></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {p.status === 'DRAFT' && <button onClick={() => approve(p.id)} title="Aprobar" className="text-blue-600 hover:text-blue-700"><CheckCircle size={15} /></button>}
                      {p.status === 'DRAFT' && <button onClick={() => remove(p.id)} title="Eliminar borrador" className="text-slate-400 hover:text-red-600"><Trash2 size={14} /></button>}
                      {p.status === 'APPROVED' && <button onClick={() => markPaid(p.id)} title="Marcar pagada" className="text-green-600 hover:text-green-700"><DollarSign size={15} /></button>}
                      <button onClick={() => sendEmail(p.id)} title="Enviar recibo por email" className="text-slate-400 hover:text-blue-600"><Mail size={14} /></button>
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
