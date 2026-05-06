'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import api from '@/lib/api';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import { BookOpen, TrendingUp, Scale, List, Pencil } from 'lucide-react';

type Tab = 'balance' | 'income' | 'journal' | 'accounts';

export default function AccountingPage() {
  const [tab, setTab] = useState<Tab>('balance');
  const [balance, setBalance] = useState<any>(null);
  const [income, setIncome] = useState<any>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingBalance, setEditingBalance] = useState<{ id: string; name: string; balance: number } | null>(null);
  const [balanceInput, setBalanceInput] = useState('');

  const now = new Date();
  const [year] = useState(now.getFullYear());
  const [month] = useState(now.getMonth() + 1);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [b, inc, j, acc] = await Promise.all([
        api.get('/accounting/balance-sheet'),
        api.get(`/accounting/income-statement?year=${year}&month=${month}`),
        api.get('/accounting/journal-entries'),
        api.get('/accounting/accounts'),
      ]);
      setBalance(b.data.data);
      setIncome(inc.data.data);
      setEntries(j.data.data ?? []);
      setAccounts(acc.data.data ?? []);
    } catch {
      // accounts may be empty first time
    } finally {
      setLoading(false);
    }
  };

  const seedAccounts = async () => {
    try {
      await api.post('/accounting/seed-accounts');
      toast.success('Plan de cuentas creado');
      loadAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Error');
    }
  };

  const saveOpeningBalance = async () => {
    if (!editingBalance) return;
    try {
      await api.patch(`/accounting/accounts/${editingBalance.id}/opening-balance`, { balance: parseFloat(balanceInput) || 0 });
      toast.success('Saldo actualizado');
      setEditingBalance(null);
      loadAll();
    } catch {
      toast.error('Error al actualizar saldo');
    }
  };

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'balance', label: 'Balance General', icon: <Scale size={16} /> },
    { key: 'income', label: 'Estado de Resultados', icon: <TrendingUp size={16} /> },
    { key: 'journal', label: 'Libro Diario', icon: <BookOpen size={16} /> },
    { key: 'accounts', label: 'Plan de Cuentas', icon: <List size={16} /> },
  ];

  return (
    <div>
      <PageHeader
        title="Contabilidad"
        description="Estados financieros y libro diario"
        action={
          accounts.length === 0 ? (
            <button onClick={seedAccounts} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
              Crear Plan de Cuentas
            </button>
          ) : undefined
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-lg w-fit">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {loading && <p className="text-slate-400 text-sm">Cargando...</p>}

      {/* BALANCE GENERAL */}
      {tab === 'balance' && balance && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
            <h2 className="font-semibold text-slate-700 mb-4">Activos</h2>
            <table className="w-full text-sm">
              <tbody>
                {balance.assets.items.map((a: any) => (
                  <tr key={a.code} className="border-b border-slate-50">
                    <td className="py-1.5 text-slate-500 font-mono text-xs">{a.code}</td>
                    <td className="py-1.5 text-slate-600">{a.name}</td>
                    <td className="py-1.5 text-right font-medium">{formatCurrency(a.balance)}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-slate-200">
                  <td colSpan={2} className="py-2 font-bold text-slate-700">Total Activos</td>
                  <td className="py-2 text-right font-bold text-blue-600">{formatCurrency(balance.assets.total)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
              <h2 className="font-semibold text-slate-700 mb-4">Pasivos</h2>
              <table className="w-full text-sm">
                <tbody>
                  {balance.liabilities.items.map((a: any) => (
                    <tr key={a.code} className="border-b border-slate-50">
                      <td className="py-1.5 text-slate-500 font-mono text-xs">{a.code}</td>
                      <td className="py-1.5 text-slate-600">{a.name}</td>
                      <td className="py-1.5 text-right font-medium">{formatCurrency(a.balance)}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-slate-200">
                    <td colSpan={2} className="py-2 font-bold text-slate-700">Total Pasivos</td>
                    <td className="py-2 text-right font-bold text-red-600">{formatCurrency(balance.liabilities.total)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
              <h2 className="font-semibold text-slate-700 mb-4">Patrimonio</h2>
              <table className="w-full text-sm">
                <tbody>
                  {balance.equity.items.map((a: any) => (
                    <tr key={a.code} className="border-b border-slate-50">
                      <td className="py-1.5 text-slate-500 font-mono text-xs">{a.code}</td>
                      <td className="py-1.5 text-slate-600">{a.name}</td>
                      <td className="py-1.5 text-right font-medium">{formatCurrency(a.balance)}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-slate-200">
                    <td colSpan={2} className="py-2 font-bold text-slate-700">Total Patrimonio</td>
                    <td className="py-2 text-right font-bold text-green-600">{formatCurrency(balance.equity.total)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ESTADO DE RESULTADOS */}
      {tab === 'income' && income && (
        <div className="max-w-2xl space-y-6">
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
            <h2 className="font-semibold text-slate-700 mb-1">Ingresos</h2>
            <p className="text-xs text-slate-400 mb-4">Período: {income.period}</p>
            <table className="w-full text-sm">
              <tbody>
                {income.income.items.map((a: any) => (
                  <tr key={a.code} className="border-b border-slate-50">
                    <td className="py-1.5 text-slate-500 font-mono text-xs">{a.code}</td>
                    <td className="py-1.5 text-slate-600">{a.name}</td>
                    <td className="py-1.5 text-right font-medium text-green-600">{formatCurrency(a.balance)}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-slate-200">
                  <td colSpan={2} className="py-2 font-bold">Total Ingresos</td>
                  <td className="py-2 text-right font-bold text-green-600">{formatCurrency(income.income.total)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
            <h2 className="font-semibold text-slate-700 mb-4">Gastos</h2>
            <table className="w-full text-sm">
              <tbody>
                {income.expenses.items.map((a: any) => (
                  <tr key={a.code} className="border-b border-slate-50">
                    <td className="py-1.5 text-slate-500 font-mono text-xs">{a.code}</td>
                    <td className="py-1.5 text-slate-600">{a.name}</td>
                    <td className="py-1.5 text-right font-medium text-red-500">{formatCurrency(a.balance)}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-slate-200">
                  <td colSpan={2} className="py-2 font-bold">Total Gastos</td>
                  <td className="py-2 text-right font-bold text-red-500">{formatCurrency(income.expenses.total)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className={`rounded-xl p-6 ${income.netIncome >= 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="flex justify-between items-center">
              <span className="font-bold text-lg text-slate-700">Utilidad Neta</span>
              <span className={`text-2xl font-bold ${income.netIncome >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {formatCurrency(income.netIncome)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* PLAN DE CUENTAS / SALDOS DE APERTURA */}
      {tab === 'accounts' && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
            <p className="text-xs text-slate-500">Haz clic en <Pencil size={11} className="inline" /> para ajustar el saldo de apertura de cualquier cuenta.</p>
          </div>
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100">
              <tr>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Código</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Nombre</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Tipo</th>
                <th className="text-right px-4 py-3 text-slate-500 font-medium">Saldo</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {accounts.length === 0 && (
                <tr><td colSpan={5} className="text-center py-8 text-slate-400">No hay cuentas. Crea el plan de cuentas primero.</td></tr>
              )}
              {accounts.map((a: any) => (
                <tr key={a.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{a.code}</td>
                  <td className="px-4 py-2.5 text-slate-700" style={{ paddingLeft: `${(a.code.split('.').length - 1) * 16 + 16}px` }}>{a.name}</td>
                  <td className="px-4 py-2.5 text-slate-400 text-xs">{a.type}</td>
                  <td className="px-4 py-2.5 text-right font-medium">{formatCurrency(Number(a.balance))}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button onClick={() => { setEditingBalance({ id: a.id, name: a.name, balance: Number(a.balance) }); setBalanceInput(String(Number(a.balance))); }}
                      className="text-slate-300 hover:text-blue-600"><Pencil size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal saldo de apertura */}
      {editingBalance && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-semibold text-slate-800 mb-1">Saldo de Apertura</h3>
            <p className="text-sm text-slate-500 mb-4">{editingBalance.name}</p>
            <input
              type="number" step="0.01"
              value={balanceInput}
              onChange={e => setBalanceInput(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-4"
              placeholder="0.00"
              autoFocus
            />
            <div className="flex gap-2">
              <button onClick={saveOpeningBalance} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700">Guardar</button>
              <button onClick={() => setEditingBalance(null)} className="flex-1 border border-slate-200 py-2 rounded-lg text-sm hover:bg-slate-50">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* LIBRO DIARIO */}
      {tab === 'journal' && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-4 py-3 text-slate-600 font-medium">Fecha</th>
                <th className="text-left px-4 py-3 text-slate-600 font-medium">Descripción</th>
                <th className="text-left px-4 py-3 text-slate-600 font-medium">Referencia</th>
                <th className="text-right px-4 py-3 text-slate-600 font-medium">Débito</th>
                <th className="text-right px-4 py-3 text-slate-600 font-medium">Crédito</th>
                <th className="text-center px-4 py-3 text-slate-600 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 && (
                <tr><td colSpan={6} className="text-center py-8 text-slate-400">No hay asientos contables</td></tr>
              )}
              {entries.map(e => (
                <tr key={e.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-500">{new Date(e.date).toLocaleDateString('es-DO')}</td>
                  <td className="px-4 py-3 text-slate-700">{e.description}</td>
                  <td className="px-4 py-3 text-slate-400 font-mono text-xs">{e.reference ?? '—'}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(e.totalDebit)}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(e.totalCredit)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      e.status === 'POSTED' ? 'bg-green-100 text-green-700' :
                      e.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>{e.status === 'POSTED' ? 'Contabilizado' : e.status === 'CANCELLED' ? 'Cancelado' : 'Borrador'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
