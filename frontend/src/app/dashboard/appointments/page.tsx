'use client';
import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Plus, Calendar, Clock, User, CheckCircle, X, Copy } from 'lucide-react';
import { BranchBadge } from '@/components/ui/branch-badge';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';

interface Appt {
  id: string; customerName: string; customerPhone?: string; customerEmail?: string;
  employeeName?: string; serviceName: string; durationMinutes: number; servicePrice?: number;
  appointmentDate: string; startTime: string; endTime?: string; status: string;
  notes?: string; publicToken?: string; createdAt: string;
}

const STATUS_CFG: Record<string, { label: string; color: string }> = {
  PENDING:     { label: 'Pendiente',   color: 'bg-amber-100 text-amber-700' },
  CONFIRMED:   { label: 'Confirmada',  color: 'bg-blue-100 text-blue-700' },
  IN_PROGRESS: { label: 'En curso',    color: 'bg-purple-100 text-purple-700' },
  COMPLETED:   { label: 'Completada',  color: 'bg-green-100 text-green-700' },
  CANCELLED:   { label: 'Cancelada',   color: 'bg-red-100 text-red-600' },
  NO_SHOW:     { label: 'No se presentó', color: 'bg-slate-100 text-slate-600' },
};

const STATUSES = ['PENDING','CONFIRMED','IN_PROGRESS','COMPLETED','CANCELLED','NO_SHOW'];

const EMPTY = {
  customerName: '', customerPhone: '', customerEmail: '',
  employeeName: '', serviceName: '', durationMinutes: '60', servicePrice: '',
  appointmentDate: new Date().toISOString().split('T')[0], startTime: '09:00', notes: '',
};

export default function AppointmentsPage() {
  const confirm = useConfirm();
  const { user } = useAuth();
  const [appts, setAppts] = useState<Appt[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Appt | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const load = () => api.get('/appointments').then(r => setAppts(r.data.data ?? [])).catch(() => {});
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      durationMinutes: parseInt(form.durationMinutes) || 60,
      servicePrice: form.servicePrice ? parseFloat(form.servicePrice) : undefined,
      employeeName: form.employeeName || undefined,
      customerPhone: form.customerPhone || undefined,
      customerEmail: form.customerEmail || undefined,
      notes: form.notes || undefined,
    };
    try {
      editing
        ? await api.patch(`/appointments/${editing.id}`, payload)
        : await api.post('/appointments', payload);
      toast.success(editing ? 'Cita actualizada' : 'Cita creada');
      setShowForm(false); setEditing(null); load();
    } catch (err: any) { toast.error(err.response?.data?.message ?? 'Error'); }
  };

  const setStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/appointments/${id}/status`, { status });
      toast.success('Estado actualizado'); load();
    } catch { toast.error('Error'); }
  };

  const remove = async (id: string) => {
    if (!await confirm({ title: 'Eliminar cita', message: '¿Eliminar esta cita?', confirmText: 'Eliminar' })) return;
    try { await api.delete(`/appointments/${id}`); toast.success('Eliminada'); load(); }
    catch { toast.error('Error'); }
  };

  const copyBookingLink = () => {
    if (!user?.tenantId) return;
    const url = `${window.location.origin}/book/${user.tenantId}`;
    navigator.clipboard.writeText(url);
    toast.success('Enlace copiado — compártelo con tus clientes');
  };

  const openNew = () => { setEditing(null); setForm(EMPTY); setShowForm(true); };
  const openEdit = (a: Appt) => {
    setEditing(a);
    setForm({
      customerName: a.customerName, customerPhone: a.customerPhone ?? '',
      customerEmail: a.customerEmail ?? '', employeeName: a.employeeName ?? '',
      serviceName: a.serviceName, durationMinutes: String(a.durationMinutes),
      servicePrice: a.servicePrice ? String(a.servicePrice) : '',
      appointmentDate: a.appointmentDate, startTime: a.startTime, notes: a.notes ?? '',
    });
    setShowForm(true);
  };

  const filtered = appts.filter(a => {
    if (statusFilter !== 'ALL' && a.status !== statusFilter) return false;
    if (dateFilter && a.appointmentDate !== dateFilter) return false;
    return true;
  });

  // Group by date
  const byDate: Record<string, Appt[]> = {};
  for (const a of filtered) {
    if (!byDate[a.appointmentDate]) byDate[a.appointmentDate] = [];
    byDate[a.appointmentDate].push(a);
  }
  const sortedDates = Object.keys(byDate).sort().reverse();

  return (
    <div>
      <PageHeader title="Agenda / Citas" description="Salones, barberías, consultorios"
        action={
          <div className="flex gap-2">
            <button onClick={copyBookingLink}
              className="flex items-center gap-2 border border-slate-200 bg-white text-slate-600 px-4 py-2 rounded-lg text-sm hover:bg-slate-50">
              <Copy size={14} /> Link de Reserva
            </button>
            <button onClick={openNew} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
              <Plus size={16} /> Nueva Cita
            </button>
          </div>
        }
      />

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{editing ? 'Editar Cita' : 'Nueva Cita'}</h2>
              <BranchBadge />
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input required placeholder="Cliente *" value={form.customerName}
                  onChange={e => setForm({ ...form, customerName: e.target.value })}
                  className="border rounded-lg px-3 py-2 text-sm" />
                <input placeholder="Teléfono" value={form.customerPhone}
                  onChange={e => setForm({ ...form, customerPhone: e.target.value })}
                  className="border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input required placeholder="Servicio *" value={form.serviceName}
                  onChange={e => setForm({ ...form, serviceName: e.target.value })}
                  className="border rounded-lg px-3 py-2 text-sm" />
                <input placeholder="Empleado/Estilista" value={form.employeeName}
                  onChange={e => setForm({ ...form, employeeName: e.target.value })}
                  className="border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Fecha *</label>
                  <input required type="date" value={form.appointmentDate}
                    onChange={e => setForm({ ...form, appointmentDate: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Hora *</label>
                  <input required type="time" value={form.startTime}
                    onChange={e => setForm({ ...form, startTime: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Duración (min)</label>
                  <input type="number" min="15" step="15" value={form.durationMinutes}
                    onChange={e => setForm({ ...form, durationMinutes: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="number" step="0.01" placeholder="Precio del servicio (RD$)" value={form.servicePrice}
                  onChange={e => setForm({ ...form, servicePrice: e.target.value })}
                  className="border rounded-lg px-3 py-2 text-sm" />
                <input placeholder="Email del cliente" value={form.customerEmail}
                  onChange={e => setForm({ ...form, customerEmail: e.target.value })}
                  className="border rounded-lg px-3 py-2 text-sm" />
              </div>
              <textarea placeholder="Notas" rows={2} value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="flex gap-2 mt-4">
              <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm">Guardar</button>
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 border py-2 rounded-lg text-sm">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap items-center">
        <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm" />
        {dateFilter && <button onClick={() => setDateFilter('')} className="text-xs text-slate-400 hover:text-slate-600">✕ Limpiar fecha</button>}
        <div className="flex gap-1 flex-wrap">
          {['ALL', ...STATUSES].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${statusFilter === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
              {s === 'ALL' ? 'Todas' : STATUS_CFG[s]?.label}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar grouped by date */}
      <div className="space-y-5">
        {sortedDates.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-12 text-center text-slate-400">
            <Calendar size={32} className="mx-auto mb-3 opacity-30" />
            <p>No hay citas registradas</p>
          </div>
        )}
        {sortedDates.map(date => (
          <div key={date}>
            <h3 className="text-sm font-semibold text-slate-500 mb-2 px-1">
              {new Date(date + 'T12:00:00').toLocaleDateString('es-DO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </h3>
            <div className="space-y-2">
              {byDate[date].sort((a, b) => a.startTime.localeCompare(b.startTime)).map(a => {
                const cfg = STATUS_CFG[a.status] ?? { label: a.status, color: 'bg-slate-100 text-slate-600' };
                return (
                  <div key={a.id} className="bg-white rounded-xl border border-slate-100 shadow-sm flex items-center gap-4 px-5 py-3.5">
                    <div className="text-center w-16 shrink-0">
                      <p className="text-lg font-bold text-slate-800">{a.startTime}</p>
                      {a.endTime && <p className="text-xs text-slate-400">{a.endTime}</p>}
                      <p className="text-xs text-slate-400">{a.durationMinutes}min</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-semibold text-slate-800">{a.customerName}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                      </div>
                      <p className="text-sm text-slate-600">{a.serviceName}</p>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-400">
                        {a.employeeName && <span><User size={10} className="inline mr-0.5" />{a.employeeName}</span>}
                        {a.customerPhone && <span><Clock size={10} className="inline mr-0.5" />{a.customerPhone}</span>}
                        {a.notes && <span className="italic">{a.notes}</span>}
                      </div>
                    </div>
                    {a.servicePrice ? (
                      <p className="text-base font-bold text-slate-700 shrink-0">{formatCurrency(a.servicePrice)}</p>
                    ) : null}
                    <div className="flex gap-1 shrink-0">
                      {a.status === 'PENDING' && (
                        <button onClick={() => setStatus(a.id, 'CONFIRMED')} title="Confirmar"
                          className="text-blue-500 hover:text-blue-700 p-1.5"><CheckCircle size={15} /></button>
                      )}
                      {a.status === 'CONFIRMED' && (
                        <button onClick={() => setStatus(a.id, 'IN_PROGRESS')} title="Iniciar"
                          className="text-purple-500 hover:text-purple-700 p-1.5 text-xs font-medium">▶</button>
                      )}
                      {a.status === 'IN_PROGRESS' && (
                        <button onClick={() => setStatus(a.id, 'COMPLETED')} title="Completar"
                          className="text-green-500 hover:text-green-700 p-1.5"><CheckCircle size={15} /></button>
                      )}
                      {!['COMPLETED','CANCELLED','NO_SHOW'].includes(a.status) && (
                        <button onClick={() => setStatus(a.id, 'NO_SHOW')} title="No se presentó"
                          className="text-slate-400 hover:text-amber-600 p-1.5 text-xs">👻</button>
                      )}
                      <button onClick={() => openEdit(a)} className="text-slate-400 hover:text-blue-600 p-1.5 text-xs">✏</button>
                      {!['COMPLETED','CANCELLED'].includes(a.status) && (
                        <button onClick={() => setStatus(a.id, 'CANCELLED')} title="Cancelar"
                          className="text-slate-400 hover:text-red-500 p-1.5"><X size={14} /></button>
                      )}
                      <button onClick={() => remove(a.id)} className="text-slate-400 hover:text-red-600 p-1.5">🗑</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
