'use client';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { Calendar, Clock, User, CheckCircle } from 'lucide-react';

const TIMES = [
  '08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30',
  '12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30',
  '16:00','16:30','17:00','17:30','18:00','18:30','19:00','19:30',
];

export default function PublicBookingPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const [step, setStep] = useState<'form' | 'done'>('form');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    customerName: '', customerPhone: '', customerEmail: '',
    serviceName: '', employeeName: '',
    appointmentDate: '', startTime: '', durationMinutes: '60', notes: '',
  });

  const today = new Date().toISOString().split('T')[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.appointmentDate || !form.startTime) { toast.error('Selecciona fecha y hora'); return; }
    setLoading(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
      const res = await fetch(`${apiBase}/appointments/public/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          customerName: form.customerName,
          customerPhone: form.customerPhone || undefined,
          customerEmail: form.customerEmail || undefined,
          serviceName: form.serviceName,
          employeeName: form.employeeName || undefined,
          appointmentDate: form.appointmentDate,
          startTime: form.startTime,
          durationMinutes: parseInt(form.durationMinutes) || 60,
          notes: form.notes || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message ?? 'Error al reservar');
      }
      setStep('done');
    } catch (err: any) {
      toast.error(err.message ?? 'Error al realizar la reserva');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'done') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">¡Cita reservada!</h2>
          <p className="text-slate-500 mb-4">
            Tu cita para <strong>{form.serviceName}</strong> el{' '}
            <strong>{new Date(form.appointmentDate + 'T12:00:00').toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric', month: 'long' })}</strong>{' '}
            a las <strong>{form.startTime}</strong> ha sido registrada.
          </p>
          <p className="text-sm text-slate-400">Te contactaremos para confirmar tu cita.</p>
          <button onClick={() => { setStep('form'); setForm({ customerName: '', customerPhone: '', customerEmail: '', serviceName: '', employeeName: '', appointmentDate: '', startTime: '', durationMinutes: '60', notes: '' }); }}
            className="mt-6 text-blue-600 text-sm hover:underline">Reservar otra cita</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Calendar size={22} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-slate-800">Reservar Cita</h1>
          <p className="text-sm text-slate-500 mt-1">Completa el formulario y te confirmamos tu cita</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Cliente */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Tu nombre *</label>
            <div className="relative">
              <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input required placeholder="Nombre completo" value={form.customerName}
                onChange={e => setForm({ ...form, customerName: e.target.value })}
                className="w-full border rounded-xl px-3 py-2.5 pl-9 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Teléfono</label>
              <input placeholder="809-000-0000" value={form.customerPhone}
                onChange={e => setForm({ ...form, customerPhone: e.target.value })}
                className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Email</label>
              <input type="email" placeholder="tucorreo@gmail.com" value={form.customerEmail}
                onChange={e => setForm({ ...form, customerEmail: e.target.value })}
                className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
            </div>
          </div>

          {/* Servicio */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Servicio que deseas *</label>
            <input required placeholder="Ej: Corte de cabello, Manicure..." value={form.serviceName}
              onChange={e => setForm({ ...form, serviceName: e.target.value })}
              className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Empleado preferido (opcional)</label>
            <input placeholder="Nombre del estilista / técnico" value={form.employeeName}
              onChange={e => setForm({ ...form, employeeName: e.target.value })}
              className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
          </div>

          {/* Fecha */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Fecha *</label>
            <div className="relative">
              <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input required type="date" min={today} value={form.appointmentDate}
                onChange={e => setForm({ ...form, appointmentDate: e.target.value })}
                className="w-full border rounded-xl px-3 py-2.5 pl-9 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
            </div>
          </div>

          {/* Hora */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">Hora *</label>
            <div className="grid grid-cols-4 gap-1.5">
              {TIMES.map(t => (
                <button key={t} type="button"
                  onClick={() => setForm({ ...form, startTime: t })}
                  className={`py-2 rounded-lg text-xs font-medium border transition-colors ${form.startTime === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400 hover:text-blue-600'}`}>
                  <Clock size={10} className="inline mr-0.5" />{t}
                </button>
              ))}
            </div>
          </div>

          {/* Duración */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Duración estimada</label>
            <select value={form.durationMinutes} onChange={e => setForm({ ...form, durationMinutes: e.target.value })}
              className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30">
              <option value="30">30 minutos</option>
              <option value="60">1 hora</option>
              <option value="90">1 hora 30 min</option>
              <option value="120">2 horas</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Notas adicionales</label>
            <textarea rows={2} placeholder="Algo que debamos saber..." value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              className="w-full border rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {loading ? 'Reservando...' : 'Confirmar Cita'}
          </button>
        </form>

        <p className="text-center text-xs text-slate-400 mt-4">
          Al reservar aceptas que el negocio pueda contactarte para confirmar tu cita.
        </p>
      </div>
    </div>
  );
}
