'use client';
import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import api from '@/lib/api';
import { toast } from 'sonner';
import { DollarSign, AlertCircle, CheckCircle2 } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

interface AR { id: string; customerName: string; ncfNumber?: string; issueDate: string; dueDate: string; amount: number; paidAmount: number; balance: number; status: string; }

const statusColors: Record<string, string> = {
  PENDING: 'bg-blue-100 text-blue-700', PARTIAL: 'bg-orange-100 text-orange-700',
  PAID: 'bg-green-100 text-green-700', OVERDUE: 'bg-red-100 text-red-700', CANCELLED: 'bg-slate-100 text-slate-500',
};
const statusLabels: Record<string, string> = { PENDING: 'Pendiente', PARTIAL: 'Parcial', PAID: 'Pagada', OVERDUE: 'Vencida', CANCELLED: 'Cancelada' };

export default function AccountsReceivablePage() {
  const [items, setItems] = useState<AR[]>([]);
  const [aging, setAging] = useState<any>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [paymentForm, setPaymentForm] = useState({ amount: '', paymentDate: new Date().toISOString().split('T')[0], method: 'CASH' });

  const load = async () => {
    const [arRes, agingRes] = await Promise.all([
      api.get('/accounts-receivable').catch(() => ({ data: { data: [] } })),
      api.get('/accounts-receivable/aging').catch(() => ({ data: { data: null } })),
    ]);
    setItems(arRes.data.data ?? []);
    setAging(agingRes.data.data);
  };
  useEffect(() => { load(); }, []);

  const registerPayment = async (id: string) => {
    try {
      await api.post(`/accounts-receivable/${id}/payments`, { ...paymentForm, amount: parseFloat(paymentForm.amount) });
      toast.success('Pago registrado'); setPayingId(null); load();
    } catch (err: any) { toast.error(err.response?.data?.message ?? 'Error'); }
  };

  const pending = items.filter(i => i.status !== 'PAID' && i.status !== 'CANCELLED');
  const totalPending = pending.reduce((s, i) => s + Number(i.balance), 0);
  const totalOverdue = pending.filter(i => i.status === 'OVERDUE').reduce((s, i) => s + Number(i.balance), 0);

  return (
    <div>
      <PageHeader title="Cuentas por Cobrar" description="Control de créditos otorgados a clientes" />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-2"><span className="text-sm text-slate-500">Total por Cobrar</span><DollarSign size={18} className="text-blue-500" /></div>
          <p className="text-2xl font-bold text-slate-800">{formatCurrency(totalPending)}</p>
          <p className="text-xs text-slate-400 mt-1">{pending.length} facturas pendientes</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-2"><span className="text-sm text-slate-500">Vencido</span><AlertCircle size={18} className="text-red-500" /></div>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(totalOverdue)}</p>
          <p className="text-xs text-slate-400 mt-1">{pending.filter(i => i.status === 'OVERDUE').length} facturas vencidas</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-2"><span className="text-sm text-slate-500">Al día</span><CheckCircle2 size={18} className="text-green-500" /></div>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(totalPending - totalOverdue)}</p>
          <p className="text-xs text-slate-400 mt-1">Dentro del plazo</p>
        </div>
      </div>

      {aging && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 mb-6">
          <h2 className="font-semibold text-slate-700 mb-4">Análisis de Antigüedad</h2>
          <div className="grid grid-cols-5 gap-3 text-center text-sm">
            {[
              { label: 'Corriente', value: aging.buckets.current, color: 'text-green-600' },
              { label: '1-30 días', value: aging.buckets.days30, color: 'text-yellow-600' },
              { label: '31-60 días', value: aging.buckets.days60, color: 'text-orange-600' },
              { label: '61-90 días', value: aging.buckets.days90, color: 'text-red-500' },
              { label: '+90 días', value: aging.buckets.over90, color: 'text-red-700' },
            ].map(b => (
              <div key={b.label} className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-400 mb-1">{b.label}</p>
                <p className={`font-bold ${b.color}`}>{formatCurrency(b.value)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-100"><tr>
            <th className="text-left px-4 py-3 text-slate-600 font-medium">Cliente</th>
            <th className="text-left px-4 py-3 text-slate-600 font-medium">NCF</th>
            <th className="text-left px-4 py-3 text-slate-600 font-medium">Emisión</th>
            <th className="text-left px-4 py-3 text-slate-600 font-medium">Vencimiento</th>
            <th className="text-right px-4 py-3 text-slate-600 font-medium">Monto</th>
            <th className="text-right px-4 py-3 text-slate-600 font-medium">Pagado</th>
            <th className="text-right px-4 py-3 text-slate-600 font-medium">Saldo</th>
            <th className="text-center px-4 py-3 text-slate-600 font-medium">Estado</th>
            <th className="text-right px-4 py-3 text-slate-600 font-medium">Acciones</th>
          </tr></thead>
          <tbody>
            {items.length === 0 && <tr><td colSpan={9} className="text-center py-8 text-slate-400">No hay cuentas por cobrar</td></tr>}
            {items.map(ar => (
              <>
                <tr key={ar.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-700">{ar.customerName}</td>
                  <td className="px-4 py-3 font-mono text-slate-500 text-xs">{ar.ncfNumber ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(ar.issueDate)}</td>
                  <td className={`px-4 py-3 ${ar.status === 'OVERDUE' ? 'text-red-600 font-medium' : 'text-slate-500'}`}>{formatDate(ar.dueDate)}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(ar.amount)}</td>
                  <td className="px-4 py-3 text-right text-green-600">{formatCurrency(ar.paidAmount)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800">{formatCurrency(ar.balance)}</td>
                  <td className="px-4 py-3 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[ar.status] ?? 'bg-slate-100 text-slate-600'}`}>{statusLabels[ar.status] ?? ar.status}</span></td>
                  <td className="px-4 py-3 text-right">
                    {ar.status !== 'PAID' && ar.status !== 'CANCELLED' && (
                      <button onClick={() => setPayingId(payingId === ar.id ? null : ar.id)} className="text-blue-600 hover:text-blue-700 text-xs font-medium">Registrar Pago</button>
                    )}
                  </td>
                </tr>
                {payingId === ar.id && (
                  <tr key={`${ar.id}-pay`} className="bg-blue-50 border-b">
                    <td colSpan={9} className="px-4 py-3">
                      <div className="flex items-end gap-3">
                        <div><label className="block text-xs text-slate-500 mb-1">Monto</label><input type="number" step="0.01" max={ar.balance} className="w-32 border rounded px-2 py-1.5 text-sm" value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })} placeholder="0.00" /></div>
                        <div><label className="block text-xs text-slate-500 mb-1">Fecha</label><input type="date" className="border rounded px-2 py-1.5 text-sm" value={paymentForm.paymentDate} onChange={e => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })} /></div>
                        <div><label className="block text-xs text-slate-500 mb-1">Método</label>
                          <select className="border rounded px-2 py-1.5 text-sm" value={paymentForm.method} onChange={e => setPaymentForm({ ...paymentForm, method: e.target.value })}>
                            <option value="CASH">Efectivo</option><option value="TRANSFER">Transferencia</option><option value="CARD">Tarjeta</option><option value="CHECK">Cheque</option>
                          </select>
                        </div>
                        <button onClick={() => registerPayment(ar.id)} className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700">Guardar</button>
                        <button onClick={() => setPayingId(null)} className="text-slate-500 text-sm hover:text-slate-700">Cancelar</button>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
