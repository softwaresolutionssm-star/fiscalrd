'use client';
import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Plus, ArrowUpCircle, ArrowDownCircle, CheckSquare, Square, GitMerge, RefreshCw, GitBranch } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useBranch } from '@/contexts/branch-context';

interface Transaction {
  id: string; type: string; method: string; category: string;
  transactionDate: string; description: string; amount: number;
  reference?: string; reconciled: boolean; bankStatementRef?: string;
}

interface ReconciliationSummary {
  totalTransactions: number; reconciledCount: number; unreconciledCount: number;
  reconciledBalance: number; unreconciledBalance: number; systemBalance: number;
  unreconciledTransactions: Transaction[];
}

export default function CashBankPage() {
  const { branches, activeBranchId } = useBranch();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [balance, setBalance] = useState<any>(null);
  const [tab, setTab] = useState<'transactions' | 'reconciliation'>('transactions');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: 'INCOME', method: 'CASH', category: 'OTHER', transactionDate: new Date().toISOString().split('T')[0], description: '', amount: '', reference: '' });
  const [loading, setLoading] = useState(false);

  // Reconciliation state
  const [reconciliation, setReconciliation] = useState<ReconciliationSummary | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [statementBalance, setStatementBalance] = useState('');
  const [statementRef, setStatementRef] = useState('');
  const [reconciling, setReconciling] = useState(false);

  const load = async () => {
    const [txRes, balRes] = await Promise.all([
      api.get('/cash-bank').catch(() => ({ data: { data: [] } })),
      api.get('/cash-bank/balance').catch(() => ({ data: { data: null } })),
    ]);
    setTransactions(txRes.data.data ?? []);
    setBalance(balRes.data.data);
  };

  const loadReconciliation = async () => {
    const r = await api.get('/cash-bank/reconciliation').catch(() => null);
    if (r) setReconciliation(r.data.data ?? r.data);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { if (tab === 'reconciliation') loadReconciliation(); }, [tab]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/cash-bank', { ...form, amount: parseFloat(form.amount) });
      toast.success('Transacción registrada');
      setShowForm(false);
      setForm({ type: 'INCOME', method: 'CASH', category: 'OTHER', transactionDate: new Date().toISOString().split('T')[0], description: '', amount: '', reference: '' });
      load();
    } catch (err: any) { toast.error(err.response?.data?.message ?? 'Error'); }
    finally { setLoading(false); }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleReconcile = async () => {
    if (selectedIds.size === 0) { toast.error('Selecciona al menos una transacción'); return; }
    if (!statementBalance) { toast.error('Ingresa el saldo del estado de cuenta'); return; }
    setReconciling(true);
    try {
      const r = await api.post('/cash-bank/reconciliation', {
        transactionIds: Array.from(selectedIds),
        statementBalance: parseFloat(statementBalance),
        statementRef: statementRef || undefined,
      });
      const result = r.data.data ?? r.data;
      toast.success(result.message);
      setSelectedIds(new Set());
      setStatementBalance('');
      setStatementRef('');
      loadReconciliation();
    } catch (err: any) { toast.error(err.response?.data?.message ?? 'Error'); }
    finally { setReconciling(false); }
  };

  const handleUnreconcile = async (id: string) => {
    await api.patch(`/cash-bank/reconciliation/${id}/unreconcile`).catch(() => {});
    loadReconciliation();
    toast.success('Transacción desmarcada');
  };

  const categoryLabels: Record<string, string> = { SALE: 'Venta', PURCHASE: 'Compra', PAYROLL: 'Nómina', TAX: 'Impuesto', EXPENSE: 'Gasto', OTHER: 'Otro' };
  const methodLabels: Record<string, string> = { CASH: 'Efectivo', TRANSFER: 'Transferencia', CARD: 'Tarjeta', CHECK: 'Cheque' };

  return (
    <div>
      <PageHeader title="Caja y Bancos" description="Control de entradas y salidas de dinero" action={
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
          <Plus size={16} /> Nueva Transacción
        </button>
      } />

      {balance && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 col-span-1">
            <p className="text-sm text-slate-500 mb-1">Balance General</p>
            <p className={`text-2xl font-bold ${balance.balance >= 0 ? 'text-slate-800' : 'text-red-600'}`}>{formatCurrency(balance.balance)}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            <p className="text-sm text-slate-500 mb-1">Total Ingresos</p>
            <p className="text-xl font-bold text-green-600">{formatCurrency(balance.totalIncome)}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            <p className="text-sm text-slate-500 mb-1">Total Egresos</p>
            <p className="text-xl font-bold text-red-500">{formatCurrency(balance.totalExpenses)}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            <p className="text-sm text-slate-500 mb-1">Efectivo</p>
            <p className="text-xl font-bold text-slate-700">{formatCurrency(balance.byMethod?.CASH?.balance ?? 0)}</p>
          </div>
        </div>
      )}

      {/* Per-branch balance breakdown (owner only, when viewing all branches) */}
      {balance?.byBranch && Object.keys(balance.byBranch).length > 0 && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 mb-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <GitBranch size={15} className="text-indigo-500" /> Balance por Sucursal
          </h3>
          <div className="divide-y divide-slate-50">
            {Object.entries(balance.byBranch).map(([key, b]: [string, any]) => {
              const branchName = key === '__general__'
                ? 'Sin sucursal'
                : (branches.find(br => br.id === b.branchId)?.name ?? b.branchId ?? 'Sucursal');
              return (
                <div key={key} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-700 font-medium">{branchName}</span>
                    <span className="text-xs text-slate-400">
                      <span className="text-green-600">+{formatCurrency(b.income)}</span>
                      {' / '}
                      <span className="text-red-500">-{formatCurrency(b.expenses)}</span>
                    </span>
                  </div>
                  <span className={`text-sm font-semibold ${b.balance >= 0 ? 'text-slate-800' : 'text-red-600'}`}>
                    {formatCurrency(b.balance)}
                  </span>
                </div>
              );
            })}
            <div className="flex items-center justify-between pt-3">
              <span className="text-sm font-semibold text-slate-700">TOTAL</span>
              <span className={`text-base font-bold ${balance.balance >= 0 ? 'text-slate-800' : 'text-red-600'}`}>
                {formatCurrency(balance.balance)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-slate-100 p-1 rounded-lg w-fit">
        {(['transactions', 'reconciliation'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === t ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {t === 'transactions' ? 'Transacciones' : 'Conciliación Bancaria'}
          </button>
        ))}
      </div>

      {showForm && tab === 'transactions' && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 mb-6">
          <h2 className="font-semibold text-slate-700 mb-4">Nueva Transacción</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-3 gap-4">
            <div><label className="block text-sm font-medium text-slate-600 mb-1">Tipo *</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                <option value="INCOME">Ingreso</option><option value="EXPENSE">Egreso</option>
              </select>
            </div>
            <div><label className="block text-sm font-medium text-slate-600 mb-1">Método</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.method} onChange={e => setForm({ ...form, method: e.target.value })}>
                <option value="CASH">Efectivo</option><option value="TRANSFER">Transferencia</option><option value="CARD">Tarjeta</option><option value="CHECK">Cheque</option>
              </select>
            </div>
            <div><label className="block text-sm font-medium text-slate-600 mb-1">Categoría</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                <option value="SALE">Venta</option><option value="PURCHASE">Compra</option><option value="PAYROLL">Nómina</option><option value="TAX">Impuesto</option><option value="EXPENSE">Gasto</option><option value="OTHER">Otro</option>
              </select>
            </div>
            <div><label className="block text-sm font-medium text-slate-600 mb-1">Fecha *</label><input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.transactionDate} onChange={e => setForm({ ...form, transactionDate: e.target.value })} required /></div>
            <div><label className="block text-sm font-medium text-slate-600 mb-1">Descripción *</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required /></div>
            <div><label className="block text-sm font-medium text-slate-600 mb-1">Monto (RD$) *</label><input type="number" step="0.01" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required /></div>
            <div><label className="block text-sm font-medium text-slate-600 mb-1">Referencia</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} placeholder="Nº cheque, transferencia, etc." /></div>
            <div className="col-span-2 flex gap-2 items-end justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-slate-50">Cancelar</button>
              <button type="submit" disabled={loading} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{loading ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </form>
        </div>
      )}

      {/* ── TAB TRANSACCIONES ── */}
      {tab === 'transactions' && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100"><tr>
              <th className="text-left px-4 py-3 text-slate-600 font-medium">Fecha</th>
              <th className="text-left px-4 py-3 text-slate-600 font-medium">Descripción</th>
              <th className="text-left px-4 py-3 text-slate-600 font-medium">Categoría</th>
              <th className="text-left px-4 py-3 text-slate-600 font-medium">Método</th>
              <th className="text-left px-4 py-3 text-slate-600 font-medium">Referencia</th>
              <th className="text-center px-4 py-3 text-slate-600 font-medium">Conciliado</th>
              <th className="text-right px-4 py-3 text-slate-600 font-medium">Monto</th>
            </tr></thead>
            <tbody>
              {transactions.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-slate-400">No hay transacciones registradas</td></tr>}
              {transactions.map(t => (
                <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-500">{formatDate(t.transactionDate)}</td>
                  <td className="px-4 py-3 text-slate-700">{t.description}</td>
                  <td className="px-4 py-3 text-slate-500">{categoryLabels[t.category] ?? t.category}</td>
                  <td className="px-4 py-3 text-slate-500">{methodLabels[t.method] ?? t.method}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{t.reference ?? '—'}</td>
                  <td className="px-4 py-3 text-center">
                    {t.reconciled
                      ? <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full">✓ Sí</span>
                      : <span className="text-xs text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`flex items-center justify-end gap-1 font-semibold ${t.type === 'INCOME' ? 'text-green-600' : 'text-red-500'}`}>
                      {t.type === 'INCOME' ? <ArrowUpCircle size={14} /> : <ArrowDownCircle size={14} />}
                      {formatCurrency(t.amount)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── TAB CONCILIACIÓN ── */}
      {tab === 'reconciliation' && reconciliation && (
        <div className="space-y-5">
          {/* Resumen */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Saldo del sistema', value: formatCurrency(reconciliation.systemBalance), color: 'text-slate-800' },
              { label: 'Transacciones conciliadas', value: reconciliation.reconciledCount, color: 'text-green-600' },
              { label: 'Pendientes de conciliar', value: reconciliation.unreconciledCount, color: 'text-amber-600' },
              { label: 'Saldo no conciliado', value: formatCurrency(reconciliation.unreconciledBalance), color: 'text-blue-600' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                <p className="text-xs text-slate-500 mb-1">{s.label}</p>
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Panel de conciliación */}
          {reconciliation.unreconciledTransactions.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-800 flex items-center gap-2"><GitMerge size={16} className="text-blue-500" /> Conciliar Transacciones</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Selecciona las transacciones que aparecen en tu estado de cuenta bancario</p>
                </div>
                {selectedIds.size > 0 && (
                  <div className="flex items-center gap-3">
                    <input
                      type="number" step="0.01"
                      placeholder="Saldo del estado de cuenta"
                      value={statementBalance}
                      onChange={e => setStatementBalance(e.target.value)}
                      className="border rounded-lg px-3 py-1.5 text-sm w-52 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                    <input
                      type="text"
                      placeholder="Ref. estado de cuenta (opcional)"
                      value={statementRef}
                      onChange={e => setStatementRef(e.target.value)}
                      className="border rounded-lg px-3 py-1.5 text-sm w-44 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                    <button
                      onClick={handleReconcile}
                      disabled={reconciling}
                      className="flex items-center gap-2 bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                    >
                      {reconciling ? <RefreshCw size={13} className="animate-spin" /> : <CheckSquare size={13} />}
                      Conciliar {selectedIds.size} seleccionada{selectedIds.size !== 1 ? 's' : ''}
                    </button>
                  </div>
                )}
              </div>
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-2 w-10"></th>
                    <th className="text-left px-4 py-2 text-slate-500 font-medium">Fecha</th>
                    <th className="text-left px-4 py-2 text-slate-500 font-medium">Descripción</th>
                    <th className="text-left px-4 py-2 text-slate-500 font-medium">Referencia</th>
                    <th className="text-right px-4 py-2 text-slate-500 font-medium">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {reconciliation.unreconciledTransactions.map(t => (
                    <tr
                      key={t.id}
                      onClick={() => toggleSelect(t.id)}
                      className={`border-b border-slate-50 cursor-pointer transition-colors ${selectedIds.has(t.id) ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                    >
                      <td className="px-4 py-2.5 text-center">
                        {selectedIds.has(t.id)
                          ? <CheckSquare size={16} className="text-blue-600 mx-auto" />
                          : <Square size={16} className="text-slate-300 mx-auto" />}
                      </td>
                      <td className="px-4 py-2.5 text-slate-500">{formatDate(t.transactionDate)}</td>
                      <td className="px-4 py-2.5 text-slate-700">{t.description}</td>
                      <td className="px-4 py-2.5 text-slate-400 text-xs">{t.reference ?? '—'}</td>
                      <td className={`px-4 py-2.5 text-right font-semibold ${t.type === 'INCOME' ? 'text-green-600' : 'text-red-500'}`}>
                        {t.type === 'INCOME' ? '+' : '-'}{formatCurrency(t.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Transacciones ya conciliadas */}
          {reconciliation.reconciledCount > 0 && (
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
              <div className="px-5 py-3 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-700">Ya conciliadas ({reconciliation.reconciledCount})</h3>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="text-left px-4 py-2 text-slate-500 font-medium">Fecha</th>
                    <th className="text-left px-4 py-2 text-slate-500 font-medium">Descripción</th>
                    <th className="text-left px-4 py-2 text-slate-500 font-medium">Ref. estado</th>
                    <th className="text-right px-4 py-2 text-slate-500 font-medium">Monto</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.filter(t => t.reconciled).map(t => (
                    <tr key={t.id} className="border-b border-slate-50 bg-green-50/30">
                      <td className="px-4 py-2.5 text-slate-500">{formatDate(t.transactionDate)}</td>
                      <td className="px-4 py-2.5 text-slate-700">{t.description}</td>
                      <td className="px-4 py-2.5 text-slate-400 text-xs">{t.bankStatementRef ?? '—'}</td>
                      <td className={`px-4 py-2.5 text-right font-semibold ${t.type === 'INCOME' ? 'text-green-600' : 'text-red-500'}`}>
                        {t.type === 'INCOME' ? '+' : '-'}{formatCurrency(t.amount)}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button onClick={() => handleUnreconcile(t.id)} className="text-xs text-slate-400 hover:text-red-500 transition-colors">desmarcar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
