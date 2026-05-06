'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import {
  LockOpen, Lock, ShoppingCart, Banknote, CreditCard,
  ArrowLeftRight, TrendingUp, AlertTriangle, CheckCircle2,
  ChevronRight, History, MinusCircle, PlusCircle, ArrowDownCircle,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Session {
  id: string;
  openedByName: string;
  openedAt: string;
  initialAmount: number;
  totalCashSales: number;
  totalCardSales: number;
  totalTransferSales: number;
  totalSales: number;
  saleCount: number;
  totalExpenses: number;
  totalWithdrawals: number;
  totalExtraIncome: number;
  totalFiadoCollections: number;
  status: 'OPEN' | 'CLOSED';
  closedAt?: string;
  closedByName?: string;
  actualCash?: number;
  expectedCash?: number;
  cashDifference?: number;
  notes?: string;
}

interface Entry {
  id: string;
  type: 'EXPENSE' | 'WITHDRAWAL' | 'INCOME';
  amount: number;
  description: string;
  category: string;
  expenseAt: string;
}

interface Summary {
  session: Session;
  sales: { cash: number; card: number; transfer: number; credit: number; total: number; count: number };
  entries: Entry[];
  totalExpenses: number;
  totalWithdrawals: number;
  totalExtraIncome: number;
  totalFiadoCollections: number;
  expectedCash: number;
}

function elapsed(from: string) {
  const diff = Math.floor((Date.now() - new Date(from).getTime()) / 1000);
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  return `${h}h ${m}m`;
}

// ─── Entry form modal (gasto / retiro / ingreso) ──────────────────────────────

type EntryType = 'EXPENSE' | 'WITHDRAWAL' | 'INCOME';

const ENTRY_CONFIG: Record<EntryType, { label: string; color: string; icon: any; sign: string }> = {
  EXPENSE:    { label: 'Gasto de Caja',  color: 'red',    icon: MinusCircle,     sign: '-' },
  WITHDRAWAL: { label: 'Retiro',         color: 'orange', icon: ArrowDownCircle, sign: '-' },
  INCOME:     { label: 'Ingreso Extra',  color: 'green',  icon: PlusCircle,      sign: '+' },
};

const EXPENSE_CATEGORIES = ['GENERAL', 'SUMINISTROS', 'TRANSPORTE', 'ALIMENTACION', 'MANTENIMIENTO', 'OTRO'];
const WITHDRAWAL_CATEGORIES = ['RETIRO_PROPIETARIO', 'PAGO_DEUDA', 'OTRO'];
const INCOME_CATEGORIES = ['DEVOLUCION_PROVEEDOR', 'COBRO_DEUDA', 'DEPOSITO_PROPIETARIO', 'OTRO'];

function categoryLabel(cat: string) {
  return cat.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase());
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CajaPage() {
  const { user } = useAuth();
  const [session, setSession]   = useState<Session | null | undefined>(undefined);
  const [summary, setSummary]   = useState<Summary | null>(null);
  const [history, setHistory]   = useState<Session[]>([]);
  const [view, setView]         = useState<'main' | 'open' | 'close' | 'history' | 'entry'>('main');
  const [entryType, setEntryType] = useState<EntryType>('EXPENSE');

  // Open form
  const [initialAmount, setInitialAmount]   = useState('');
  const [openNotes, setOpenNotes]           = useState('');
  const [configuredFund, setConfiguredFund] = useState<number | null>(null);
  const [opening, setOpening]               = useState(false);

  // Close form
  const [actualCash, setActualCash]   = useState('');
  const [closeNotes, setCloseNotes]   = useState('');
  const [closing, setClosing]         = useState(false);

  // Fund config (owner/admin)
  const [editingFund, setEditingFund] = useState(false);
  const [fundInput, setFundInput]     = useState('');
  const [savingFund, setSavingFund]   = useState(false);

  // Entry form (expense/withdrawal/income)
  const [entryAmount, setEntryAmount]     = useState('');
  const [entryDesc, setEntryDesc]         = useState('');
  const [entryCategory, setEntryCategory] = useState('GENERAL');
  const [savingEntry, setSavingEntry]     = useState(false);

  // Fund assignment (admin/owner)
  interface CashierUser { id: string; firstName: string; lastName: string; role: string; pendingCashFund?: number; pendingCashFundBy?: string; }
  const [cashiers, setCashiers]           = useState<CashierUser[]>([]);
  const [assignAmounts, setAssignAmounts] = useState<Record<string, string>>({});
  const [assigningId, setAssigningId]     = useState<string | null>(null);
  const [loadingCashiers, setLoadingCashiers] = useState(false);

  // Pending fund (cashier view)
  const [pendingFund, setPendingFund]     = useState<{ amount: number | null; note: string | null; assignedBy: string | null } | null>(null);

  // Schedule warning
  const [scheduleWarning, setScheduleWarning] = useState<string | null>(null);

  // ── Load ──────────────────────────────────────────────────────────────────

  async function load() {
    try {
      const r = await api.get('/cash-register/current');
      const s: Session | null = r.data?.data !== undefined ? r.data.data : r.data;
      setSession(s !== null && !!s ? s : null);
      if (s && s.id) {
        const sr = await api.get('/cash-register/summary');
        setSummary(sr.data?.data ?? sr.data);
      } else {
        setSummary(null);
      }
    } catch {
      setSession(null);
    }
  }

  async function loadHistory() {
    try {
      const r = await api.get('/cash-register/history');
      setHistory(r.data?.data ?? r.data ?? []);
    } catch {}
  }

  async function loadCashiers() {
    setLoadingCashiers(true);
    try {
      const r = await api.get('/users');
      const all: CashierUser[] = r.data?.data ?? r.data ?? [];
      setCashiers(all.filter(u => ['cashier', 'admin', 'owner'].includes(u.role)));
    } catch {}
    finally { setLoadingCashiers(false); }
  }

  useEffect(() => {
    load();
    // Fondo global del negocio (fallback si no hay asignación individual)
    api.get('/tenants/me')
      .then(r => {
        const t = r.data?.data ?? r.data;
        if (t?.cashFund != null && Number(t.cashFund) > 0) {
          setConfiguredFund(Number(t.cashFund));
          setInitialAmount(String(Number(t.cashFund)));
        }
      })
      .catch(() => {});
    // Fondo pendiente asignado por el admin a este usuario
    api.get('/cash-register/pending-fund')
      .then(r => {
        const d = r.data?.data ?? r.data;
        if (d?.amount != null) {
          setPendingFund(d);
          setInitialAmount(String(d.amount));
        }
      })
      .catch(() => {});
    // Si es admin/owner, cargar lista de cajeros
    if (user?.role === 'owner' || user?.role === 'admin') loadCashiers();
    // Verificar si el usuario está dentro de su horario
    api.get('/schedules/check-me')
      .then(r => {
        const d = r.data?.data ?? r.data;
        if (d && !d.isWithinSchedule && d.message) setScheduleWarning(d.message);
      })
      .catch(() => {});
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function handleOpen(e: React.FormEvent) {
    e.preventDefault();
    setOpening(true);
    try {
      await api.post('/cash-register/open', {
        initialAmount: parseFloat(initialAmount) || 0,
        notes: openNotes || undefined,
      });
      toast.success('¡Caja abierta!');
      setView('main');
      setOpenNotes('');
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Error al abrir caja');
    } finally {
      setOpening(false);
    }
  }

  async function handleClose(e: React.FormEvent) {
    e.preventDefault();
    if (!actualCash) { toast.error('Ingresa el efectivo físico contado'); return; }
    setClosing(true);
    try {
      await api.post('/cash-register/close', {
        actualCash: parseFloat(actualCash),
        notes: closeNotes || undefined,
      });
      toast.success('Caja cerrada correctamente');
      setView('main');
      setActualCash('');
      setCloseNotes('');
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Error al cerrar caja');
    } finally {
      setClosing(false);
    }
  }

  async function handleSaveFund(e: React.FormEvent) {
    e.preventDefault();
    setSavingFund(true);
    try {
      await api.patch('/tenants/me', { cashFund: parseFloat(fundInput) });
      const v = parseFloat(fundInput);
      setConfiguredFund(v);
      setInitialAmount(String(v));
      setEditingFund(false);
      toast.success('Fondo de apertura guardado');
    } catch {
      toast.error('Error al guardar');
    } finally {
      setSavingFund(false);
    }
  }

  async function handleAssignFund(userId: string) {
    const amount = parseFloat(assignAmounts[userId] || '');
    if (!amount || amount <= 0) { toast.error('Ingresa un monto válido'); return; }
    setAssigningId(userId);
    try {
      await api.patch(`/users/${userId}/assign-fund`, { amount });
      toast.success('Fondo asignado correctamente');
      setAssignAmounts(prev => ({ ...prev, [userId]: '' }));
      loadCashiers();
    } catch { toast.error('Error al asignar fondo'); }
    finally { setAssigningId(null); }
  }

  async function handleEntry(e: React.FormEvent) {
    e.preventDefault();
    setSavingEntry(true);
    try {
      await api.post('/cash-register/entry', {
        type: entryType,
        amount: parseFloat(entryAmount),
        description: entryDesc,
        category: entryCategory,
      });
      const cfg = ENTRY_CONFIG[entryType];
      toast.success(`${cfg.label} registrado`);
      setEntryAmount('');
      setEntryDesc('');
      setEntryCategory('GENERAL');
      setView('main');
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Error al registrar');
    } finally {
      setSavingEntry(false);
    }
  }

  // ── Loading ───────────────────────────────────────────────────────────────

  if (session === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  // ── Vista: Abrir Caja ─────────────────────────────────────────────────────
  if (view === 'open') {
    return (
      <div className="max-w-md mx-auto mt-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <LockOpen size={24} className="text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Apertura de Caja</h2>
              <p className="text-sm text-slate-500">{new Date().toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            </div>
          </div>
          {scheduleWarning && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
              <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-700">{scheduleWarning}</p>
            </div>
          )}
          <form onSubmit={handleOpen} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Fondo de apertura</label>
              {pendingFund?.amount != null ? (
                // Fondo asignado individualmente por el admin a este usuario
                <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-green-600 font-medium">Asignado por {pendingFund.assignedBy}</p>
                      {pendingFund.note && <p className="text-xs text-green-500 mt-0.5">{pendingFund.note}</p>}
                    </div>
                    <span className="text-2xl font-bold text-green-800">{formatCurrency(pendingFund.amount)}</span>
                  </div>
                </div>
              ) : configuredFund != null ? (
                // Fondo global del negocio
                <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                  <span className="text-sm text-slate-600">Fondo estándar del negocio</span>
                  <span className="text-xl font-bold text-slate-800">{formatCurrency(configuredFund)}</span>
                </div>
              ) : (
                // Sin configuración — el cajero ingresa manualmente
                <>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">RD$</span>
                    <input type="number" min="0" step="0.01" placeholder="0.00"
                      value={initialAmount} onChange={e => setInitialAmount(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/30 text-lg font-semibold" />
                  </div>
                  <p className="text-xs text-amber-600 mt-1">El administrador no ha asignado un fondo para este turno.</p>
                </>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Notas (opcional)</label>
              <textarea rows={2} placeholder="Observaciones del turno..."
                value={openNotes} onChange={e => setOpenNotes(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 resize-none" />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setView('main')}
                className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 text-sm font-medium">
                Cancelar
              </button>
              <button type="submit" disabled={opening}
                className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 text-sm font-medium disabled:opacity-60">
                {opening ? 'Abriendo...' : 'Abrir Caja'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ── Vista: Cerrar Caja ────────────────────────────────────────────────────
  if (view === 'close' && summary) {
    const expected = summary.expectedCash;
    const actual   = parseFloat(actualCash) || 0;
    const diff     = actual - expected;
    return (
      <div className="max-w-lg mx-auto mt-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <Lock size={24} className="text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Cierre de Caja</h2>
              <p className="text-sm text-slate-500">Turno: {elapsed(summary.session.openedAt)}</p>
            </div>
          </div>

          {/* Resumen del turno */}
          <div className="bg-slate-50 rounded-xl p-4 mb-6 space-y-2 text-sm">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Resumen del Turno</p>
            <div className="flex justify-between"><span className="text-slate-600">Fondo inicial</span><span className="font-medium">{formatCurrency(summary.session.initialAmount)}</span></div>
            <div className="flex justify-between"><span className="text-slate-600">Ventas efectivo</span><span className="font-medium text-green-600">+{formatCurrency(summary.sales.cash)}</span></div>
            <div className="flex justify-between"><span className="text-slate-600">Ventas tarjeta</span><span className="font-medium">{formatCurrency(summary.sales.card)}</span></div>
            <div className="flex justify-between"><span className="text-slate-600">Transferencias</span><span className="font-medium">{formatCurrency(summary.sales.transfer)}</span></div>
            {summary.totalFiadoCollections > 0 && (
              <div className="flex justify-between"><span className="text-slate-600">Cobros de fiado</span><span className="font-medium text-green-600">+{formatCurrency(summary.totalFiadoCollections)}</span></div>
            )}
            {summary.totalExtraIncome > 0 && (
              <div className="flex justify-between"><span className="text-slate-600">Ingresos extras</span><span className="font-medium text-green-600">+{formatCurrency(summary.totalExtraIncome)}</span></div>
            )}
            {summary.totalExpenses > 0 && (
              <div className="flex justify-between"><span className="text-red-600">Gastos de caja</span><span className="font-medium text-red-600">-{formatCurrency(summary.totalExpenses)}</span></div>
            )}
            {summary.totalWithdrawals > 0 && (
              <div className="flex justify-between"><span className="text-orange-600">Retiros</span><span className="font-medium text-orange-600">-{formatCurrency(summary.totalWithdrawals)}</span></div>
            )}
            {summary.sales.credit > 0 && (
              <div className="flex justify-between"><span className="text-amber-600">A crédito (fiado)</span><span className="font-medium text-amber-600">{formatCurrency(summary.sales.credit)}</span></div>
            )}
            <div className="border-t border-slate-200 pt-2 mt-2 flex justify-between font-semibold">
              <span className="text-slate-700">Efectivo esperado en caja</span>
              <span className="text-blue-700">{formatCurrency(expected)}</span>
            </div>
          </div>

          <form onSubmit={handleClose} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Efectivo físico contado</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">RD$</span>
                <input type="number" min="0" step="0.01" placeholder="0.00"
                  value={actualCash} onChange={e => setActualCash(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/30 text-lg font-semibold" />
              </div>
            </div>
            {actualCash && (
              <div className={`flex items-center gap-2 p-3 rounded-xl text-sm font-medium ${
                Math.abs(diff) < 1 ? 'bg-green-50 text-green-700' : diff > 0 ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'
              }`}>
                {Math.abs(diff) < 1 ? <><CheckCircle2 size={16} /> Cuadre perfecto</> :
                 diff > 0          ? <><TrendingUp size={16} /> Sobrante: {formatCurrency(diff)}</> :
                                     <><AlertTriangle size={16} /> Faltante: {formatCurrency(Math.abs(diff))}</>}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Notas del cierre</label>
              <textarea rows={2} placeholder="Observaciones, diferencias, etc..."
                value={closeNotes} onChange={e => setCloseNotes(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 resize-none" />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setView('main')}
                className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 text-sm font-medium">
                Cancelar
              </button>
              <button type="submit" disabled={closing || !actualCash}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 text-sm font-medium disabled:opacity-60">
                {closing ? 'Cerrando...' : 'Cerrar Caja'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ── Vista: Registrar entrada (gasto / retiro / ingreso) ───────────────────
  if (view === 'entry') {
    const cfg  = ENTRY_CONFIG[entryType];
    const cats = entryType === 'EXPENSE' ? EXPENSE_CATEGORIES : entryType === 'WITHDRAWAL' ? WITHDRAWAL_CATEGORIES : INCOME_CATEGORIES;
    const colorMap: Record<string, string> = { red: 'red', orange: 'orange', green: 'green' };
    const c = colorMap[cfg.color];
    return (
      <div className="max-w-md mx-auto mt-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
          {/* Selector de tipo */}
          <div className="grid grid-cols-3 gap-2 mb-6">
            {(Object.entries(ENTRY_CONFIG) as [EntryType, typeof ENTRY_CONFIG[EntryType]][]).map(([type, c]) => (
              <button key={type} onClick={() => { setEntryType(type); setEntryCategory(type === 'EXPENSE' ? 'GENERAL' : type === 'WITHDRAWAL' ? 'RETIRO_PROPIETARIO' : 'OTRO'); }}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-colors ${entryType === type
                  ? type === 'EXPENSE' ? 'bg-red-600 text-white border-red-600'
                  : type === 'WITHDRAWAL' ? 'bg-orange-500 text-white border-orange-500'
                  : 'bg-green-600 text-white border-green-600'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                {c.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              entryType === 'EXPENSE' ? 'bg-red-100' : entryType === 'WITHDRAWAL' ? 'bg-orange-100' : 'bg-green-100'
            }`}>
              <cfg.icon size={24} className={
                entryType === 'EXPENSE' ? 'text-red-600' : entryType === 'WITHDRAWAL' ? 'text-orange-500' : 'text-green-600'
              } />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">{cfg.label}</h2>
              <p className="text-xs text-slate-400">
                {entryType === 'EXPENSE'    && 'Compra o pago con justificación'}
                {entryType === 'WITHDRAWAL' && 'Retiro sin recibo — afecta contabilidad'}
                {entryType === 'INCOME'     && 'Ingreso que no es venta directa'}
              </p>
            </div>
          </div>

          <form onSubmit={handleEntry} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Monto (RD$)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">RD$</span>
                <input type="number" min="0.01" step="0.01" placeholder="0.00" required
                  value={entryAmount} onChange={e => setEntryAmount(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-lg font-semibold" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Descripción</label>
              <input type="text" placeholder={
                entryType === 'EXPENSE'    ? 'Ej: Papel para impresora, gasolina...' :
                entryType === 'WITHDRAWAL' ? 'Ej: Retiro Don Pedro, pago personal...' :
                'Ej: Devolución proveedor XYZ...'
              } required
                value={entryDesc} onChange={e => setEntryDesc(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Categoría</label>
              <select value={entryCategory} onChange={e => setEntryCategory(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                {cats.map(cat => <option key={cat} value={cat}>{categoryLabel(cat)}</option>)}
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setView('main')}
                className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 text-sm font-medium">
                Cancelar
              </button>
              <button type="submit" disabled={savingEntry}
                className={`flex-1 px-4 py-3 text-white rounded-xl text-sm font-medium disabled:opacity-60 ${
                  entryType === 'EXPENSE' ? 'bg-red-600 hover:bg-red-700' :
                  entryType === 'WITHDRAWAL' ? 'bg-orange-500 hover:bg-orange-600' :
                  'bg-green-600 hover:bg-green-700'
                }`}>
                {savingEntry ? 'Guardando...' : `Registrar ${cfg.label}`}
              </button>
            </div>
          </form>

          {/* Lista de entradas del turno */}
          {summary?.entries && summary.entries.length > 0 && (
            <div className="mt-6 pt-4 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Entradas del Turno</p>
              <div className="space-y-2">
                {summary.entries.map(e => (
                  <div key={e.id} className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                        e.type === 'INCOME' ? 'bg-green-100 text-green-700' :
                        e.type === 'WITHDRAWAL' ? 'bg-orange-100 text-orange-700' :
                        'bg-red-100 text-red-700'
                      }`}>{e.type === 'INCOME' ? 'ING' : e.type === 'WITHDRAWAL' ? 'RET' : 'GAS'}</span>
                      <span className="text-slate-600 truncate">{e.description}</span>
                    </div>
                    <span className={`font-medium ml-2 flex-shrink-0 ${e.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                      {e.type === 'INCOME' ? '+' : '-'}{formatCurrency(e.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Vista: Historial ──────────────────────────────────────────────────────
  if (view === 'history') {
    return (
      <div className="max-w-2xl mx-auto mt-4">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Historial de Sesiones</h2>
            {user?.role === 'cashier' && <p className="text-xs text-slate-400">Mostrando solo tus sesiones</p>}
          </div>
          <button onClick={() => setView('main')}
            className="text-sm text-slate-500 hover:text-slate-700 border border-slate-200 px-3 py-1.5 rounded-lg">
            ← Volver
          </button>
        </div>
        {history.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center text-slate-400 text-sm">
            No hay historial de sesiones aún
          </div>
        ) : (
          <div className="space-y-3">
            {history.map(s => (
              <div key={s.id} className="bg-white rounded-xl border border-slate-100 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">{s.openedByName}</p>
                    <p className="text-xs text-slate-400">
                      {new Intl.DateTimeFormat('es-DO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Santo_Domingo' }).format(new Date(s.openedAt.endsWith('Z') || s.openedAt.includes('+') ? s.openedAt : s.openedAt + 'Z'))}
                      {s.closedAt && <> — {new Intl.DateTimeFormat('es-DO', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Santo_Domingo' }).format(new Date(s.closedAt.endsWith('Z') || s.closedAt.includes('+') ? s.closedAt : s.closedAt + 'Z'))}</>}
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    s.status === 'OPEN' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                  }`}>{s.status === 'OPEN' ? 'Abierta' : 'Cerrada'}</span>
                </div>
                <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-slate-50 text-center text-xs">
                  <div><p className="text-slate-400">Ventas</p><p className="font-bold text-slate-700">{formatCurrency(s.totalSales)}</p></div>
                  <div><p className="text-slate-400">Efectivo</p><p className="font-bold text-slate-700">{formatCurrency(s.totalCashSales)}</p></div>
                  <div><p className="text-slate-400">Retiros</p><p className="font-bold text-orange-600">{formatCurrency(s.totalWithdrawals ?? 0)}</p></div>
                  <div><p className="text-slate-400">Diferencia</p>
                    <p className={`font-bold ${s.cashDifference == null ? 'text-slate-400' : s.cashDifference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {s.cashDifference == null ? '—' : formatCurrency(s.cashDifference)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Vista Principal ───────────────────────────────────────────────────────
  return (
    <div className="max-w-lg mx-auto mt-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Control de Caja</h1>
          <p className="text-sm text-slate-500">{new Date().toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <button onClick={() => { loadHistory(); setView('history'); }}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 border border-slate-200 px-3 py-1.5 rounded-lg">
          <History size={14} /> Historial
        </button>
      </div>

      {session ? (
        <>
          {/* Status */}
          <div className="bg-green-50 border border-green-200 rounded-2xl p-5 mb-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <LockOpen size={24} className="text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-green-800">Caja Abierta</p>
              <p className="text-sm text-green-600">Por {session.openedByName} · Hace {elapsed(session.openedAt)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-green-500">Fondo inicial</p>
              <p className="font-bold text-green-800">{formatCurrency(session.initialAmount)}</p>
            </div>
          </div>

          {/* Sales summary */}
          {summary && (
            <div className="bg-white rounded-2xl border border-slate-100 p-5 mb-5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">Ventas del Turno</p>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-slate-800">{summary.sales.count}</p>
                  <p className="text-xs text-slate-500 mt-1">Transacciones</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-blue-700">{formatCurrency(summary.sales.total)}</p>
                  <p className="text-xs text-blue-500 mt-1">Total Ventas</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-slate-600"><Banknote size={15} /> Efectivo</span>
                  <span className="font-medium">{formatCurrency(summary.sales.cash)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-slate-600"><CreditCard size={15} /> Tarjeta</span>
                  <span className="font-medium">{formatCurrency(summary.sales.card)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-slate-600"><ArrowLeftRight size={15} /> Transferencia</span>
                  <span className="font-medium">{formatCurrency(summary.sales.transfer)}</span>
                </div>
                {summary.totalFiadoCollections > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-green-600">Cobros de fiado</span>
                    <span className="font-medium text-green-600">+{formatCurrency(summary.totalFiadoCollections)}</span>
                  </div>
                )}
                {summary.totalExtraIncome > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-green-600">Ingresos extras</span>
                    <span className="font-medium text-green-600">+{formatCurrency(summary.totalExtraIncome)}</span>
                  </div>
                )}
                {summary.totalExpenses > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-red-500">Gastos de caja</span>
                    <span className="font-medium text-red-500">-{formatCurrency(summary.totalExpenses)}</span>
                  </div>
                )}
                {summary.totalWithdrawals > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-orange-500">Retiros</span>
                    <span className="font-medium text-orange-500">-{formatCurrency(summary.totalWithdrawals)}</span>
                  </div>
                )}
                <div className="border-t border-slate-100 pt-2 flex items-center justify-between font-semibold">
                  <span className="text-slate-700">Efectivo esperado en caja</span>
                  <span className="text-blue-700">{formatCurrency(summary.expectedCash)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <a href="/pos"
              className="flex items-center justify-center gap-2 bg-blue-600 text-white rounded-xl px-4 py-3 text-sm font-medium hover:bg-blue-700">
              <ShoppingCart size={16} /> Ir al POS
            </a>
            <button onClick={() => { if (summary) setView('close'); else toast.error('Cargando resumen...'); }}
              className="flex items-center justify-center gap-2 bg-red-600 text-white rounded-xl px-4 py-3 text-sm font-medium hover:bg-red-700">
              <Lock size={16} /> Cerrar Caja
            </button>
          </div>

          {/* Botones de entradas */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <button onClick={() => { setEntryType('EXPENSE'); setEntryCategory('GENERAL'); setView('entry'); }}
              className="flex flex-col items-center gap-1 border border-red-200 text-red-600 rounded-xl px-3 py-2.5 text-xs font-medium hover:bg-red-50">
              <MinusCircle size={16} /> Gasto
            </button>
            <button onClick={() => { setEntryType('WITHDRAWAL'); setEntryCategory('RETIRO_PROPIETARIO'); setView('entry'); }}
              className="flex flex-col items-center gap-1 border border-orange-200 text-orange-600 rounded-xl px-3 py-2.5 text-xs font-medium hover:bg-orange-50">
              <ArrowDownCircle size={16} /> Retiro
            </button>
            <button onClick={() => { setEntryType('INCOME'); setEntryCategory('OTRO'); setView('entry'); }}
              className="flex flex-col items-center gap-1 border border-green-200 text-green-600 rounded-xl px-3 py-2.5 text-xs font-medium hover:bg-green-50">
              <PlusCircle size={16} /> Ingreso Extra
            </button>
          </div>

          {/* Panel de asignación de fondos por cajero — solo owner/admin */}
          {(user?.role === 'owner' || user?.role === 'admin') && (
            <CashierFundPanel
              cashiers={cashiers} loading={loadingCashiers}
              assignAmounts={assignAmounts} assigningId={assigningId}
              onAssign={handleAssignFund}
              onAmountChange={(id, val) => setAssignAmounts(p => ({ ...p, [id]: val }))}
              configuredFund={configuredFund} editingFund={editingFund}
              fundInput={fundInput} savingFund={savingFund}
              onEditFund={() => { setFundInput(configuredFund != null ? String(configuredFund) : ''); setEditingFund(true); }}
              onSaveFund={handleSaveFund} onFundInputChange={setFundInput}
              onCancelFund={() => setEditingFund(false)}
            />
          )}
        </>
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center mb-5">
            <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Lock size={36} className="text-slate-400" />
            </div>
            <h2 className="text-lg font-bold text-slate-700 mb-2">Caja Cerrada</h2>
            <p className="text-sm text-slate-400 mb-6">No hay una sesión activa. Abre la caja para empezar a registrar ventas.</p>
            <button onClick={() => setView('open')}
              className="inline-flex items-center gap-2 bg-green-600 text-white rounded-xl px-6 py-3 text-sm font-medium hover:bg-green-700">
              <LockOpen size={16} /> Abrir Caja <ChevronRight size={16} />
            </button>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700 flex items-start gap-3">
            <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
            <p>Para registrar ventas en el POS necesitas primero abrir la caja.</p>
          </div>

          {/* Panel de asignación de fondos por cajero — solo owner/admin */}
          {(user?.role === 'owner' || user?.role === 'admin') && (
            <CashierFundPanel
              cashiers={cashiers} loading={loadingCashiers}
              assignAmounts={assignAmounts} assigningId={assigningId}
              onAssign={handleAssignFund}
              onAmountChange={(id, val) => setAssignAmounts(p => ({ ...p, [id]: val }))}
              configuredFund={configuredFund} editingFund={editingFund}
              fundInput={fundInput} savingFund={savingFund}
              onEditFund={() => { setFundInput(configuredFund != null ? String(configuredFund) : ''); setEditingFund(true); }}
              onSaveFund={handleSaveFund} onFundInputChange={setFundInput}
              onCancelFund={() => setEditingFund(false)}
            />
          )}
        </>
      )}
    </div>
  );
}

// ─── Panel de asignación de fondos (admin/owner) ──────────────────────────────

function CashierFundPanel({
  cashiers, loading, assignAmounts, assigningId, onAssign, onAmountChange,
  configuredFund, editingFund, fundInput, savingFund,
  onEditFund, onSaveFund, onFundInputChange, onCancelFund,
}: {
  cashiers: { id: string; firstName: string; lastName: string; role: string; pendingCashFund?: number; pendingCashFundBy?: string }[];
  loading: boolean;
  assignAmounts: Record<string, string>;
  assigningId: string | null;
  onAssign: (id: string) => void;
  onAmountChange: (id: string, val: string) => void;
  configuredFund: number | null;
  editingFund: boolean;
  fundInput: string;
  savingFund: boolean;
  onEditFund: () => void;
  onSaveFund: (e: React.FormEvent) => void;
  onFundInputChange: (v: string) => void;
  onCancelFund: () => void;
}) {
  return (
    <div className="mt-5 border border-slate-200 rounded-xl overflow-hidden">
      {/* Fondo estándar global */}
      <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-700">Fondo estándar del negocio</p>
            <p className="text-xs text-slate-400">Usado cuando no se asigna uno individual</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">{configuredFund != null ? formatCurrency(configuredFund) : 'Sin configurar'}</span>
            <button onClick={onEditFund} className="text-xs text-blue-600 border border-blue-200 px-2 py-1 rounded-lg">Editar</button>
          </div>
        </div>
        {editingFund && (
          <form onSubmit={onSaveFund} className="mt-3 flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">RD$</span>
              <input type="number" min="0" step="0.01" placeholder="0.00" required
                value={fundInput} onChange={e => onFundInputChange(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
            </div>
            <button type="submit" disabled={savingFund} className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-60">
              {savingFund ? '...' : 'Guardar'}
            </button>
            <button type="button" onClick={onCancelFund} className="border border-slate-200 px-3 py-2 rounded-lg text-sm text-slate-500">×</button>
          </form>
        )}
      </div>

      {/* Lista de cajeros con asignación individual */}
      <div className="p-4">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Asignar fondo por cajero</p>
        {loading ? (
          <div className="flex justify-center py-4"><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400" /></div>
        ) : cashiers.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-3">No hay cajeros registrados</p>
        ) : (
          <div className="space-y-3">
            {cashiers.map(c => (
              <div key={c.id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700 flex-shrink-0">
                  {c.firstName[0]}{c.lastName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700">{c.firstName} {c.lastName}</p>
                  {c.pendingCashFund != null ? (
                    <p className="text-xs text-green-600">✓ Asignado: {formatCurrency(Number(c.pendingCashFund))}</p>
                  ) : (
                    <p className="text-xs text-slate-400">Sin asignación para este turno</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <div className="relative w-28">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">RD$</span>
                    <input type="number" min="0" step="0.01" placeholder="Monto"
                      value={assignAmounts[c.id] ?? ''}
                      onChange={e => onAmountChange(c.id, e.target.value)}
                      className="w-full pl-8 pr-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                  </div>
                  <button
                    onClick={() => onAssign(c.id)}
                    disabled={assigningId === c.id}
                    className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50">
                    {assigningId === c.id ? '...' : 'Asignar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
