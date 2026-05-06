'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, GitBranch, History } from 'lucide-react';
import { BranchBadge } from '@/components/ui/branch-badge';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { formatCurrency } from '@/lib/utils';
import { useBranch } from '@/contexts/branch-context';
import { useAuth } from '@/contexts/auth-context';

interface Employee { id: string; firstName: string; lastName: string; cedula?: string; position?: string; department?: string; baseSalary?: number; status: string; branchId?: string | null; }
interface BranchHistoryEntry { id: string; fromBranchId: string | null; toBranchId: string | null; transferredByName: string; notes: string | null; createdAt: string; }

export default function EmployeesPage() {
  const confirm = useConfirm();
  const { user: currentUser } = useAuth();
  const { branches, isMultiBranch, hasBranches } = useBranch();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState({ firstName: '', lastName: '', cedula: '', position: '', department: '', baseSalary: '', hireDate: '', branchId: '' });
  const [transferTarget, setTransferTarget] = useState<Employee | null>(null);
  const [transferBranchId, setTransferBranchId] = useState('');
  const [transferNotes, setTransferNotes] = useState('');
  const [historyEmployee, setHistoryEmployee] = useState<Employee | null>(null);
  const [history, setHistory] = useState<BranchHistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const load = () => api.get('/employees').then(r => setEmployees(r.data.data ?? [])).catch(() => null);
  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = { ...form, baseSalary: form.baseSalary ? parseFloat(form.baseSalary) : undefined };
      if (!payload.branchId) delete payload.branchId;
      editing ? await api.patch(`/employees/${editing.id}`, payload) : await api.post('/employees', payload);
      toast.success(editing ? 'Empleado actualizado' : 'Empleado creado');
      setShowForm(false); setEditing(null); setForm({ firstName: '', lastName: '', cedula: '', position: '', department: '', baseSalary: '', hireDate: '', branchId: '' }); load();
    } catch { toast.error('Error al guardar'); }
  };

  const doTransfer = async () => {
    if (!transferTarget) return;
    try {
      await api.patch(`/employees/${transferTarget.id}/transfer-branch`, {
        branchId: transferBranchId || null,
        notes: transferNotes || undefined,
      });
      toast.success('Empleado transferido correctamente');
      setTransferTarget(null); setTransferBranchId(''); setTransferNotes(''); load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Error al transferir');
    }
  };

  const openHistory = async (emp: Employee) => {
    setHistoryEmployee(emp);
    setLoadingHistory(true);
    try {
      const r = await api.get(`/employees/${emp.id}/branch-history`);
      setHistory(r.data.data ?? r.data ?? []);
    } catch { setHistory([]); }
    finally { setLoadingHistory(false); }
  };

  const remove = async (id: string) => {
    if (!await confirm({ title: 'Eliminar empleado', message: '¿Estás seguro de que deseas eliminar este empleado?', confirmText: 'Eliminar' })) return;
    try { await api.delete(`/employees/${id}`); toast.success('Eliminado'); load(); } catch { toast.error('Error'); }
  };

  const statusColor: Record<string, string> = { active: 'bg-green-100 text-green-700', inactive: 'bg-slate-100 text-slate-600', suspended: 'bg-red-100 text-red-700' };

  return (
    <div>
      <PageHeader title="Empleados" description="Gestión de empleados"
        action={<button onClick={() => { setShowForm(true); setEditing(null); }} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"><Plus size={16} /> Nuevo Empleado</button>} />

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <form onSubmit={save} className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{editing ? 'Editar' : 'Nuevo'} Empleado</h2>
              {!editing && <BranchBadge />}
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input required placeholder="Nombre *" value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                <input required placeholder="Apellido *" value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <input placeholder="Cédula (11 dígitos)" value={form.cedula} onChange={e => setForm({...form, cedula: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              <input placeholder="Cargo" value={form.position} onChange={e => setForm({...form, position: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              <input placeholder="Departamento" value={form.department} onChange={e => setForm({...form, department: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              <input type="number" step="0.01" placeholder="Salario Base" value={form.baseSalary} onChange={e => setForm({...form, baseSalary: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              <input type="date" placeholder="Fecha Contratación" value={form.hireDate} onChange={e => setForm({...form, hireDate: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              {currentUser?.role === 'owner' && hasBranches && (
                <select value={form.branchId} onChange={e => setForm({...form, branchId: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                  <option value="">Sin sucursal asignada</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              )}
            </div>
            <div className="flex gap-2 mt-4">
              <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm">Guardar</button>
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-slate-200 py-2 rounded-lg text-sm">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {transferTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-lg font-semibold mb-1">Transferir Empleado</h2>
            <p className="text-sm text-slate-500 mb-4">Asignar <strong>{transferTarget.firstName} {transferTarget.lastName}</strong> a otra sucursal</p>
            <div className="space-y-3">
              <select
                value={transferBranchId}
                onChange={e => setTransferBranchId(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Sin sucursal asignada</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <input
                placeholder="Motivo del traslado (opcional)"
                value={transferNotes}
                onChange={e => setTransferNotes(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={doTransfer} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium">Confirmar</button>
              <button onClick={() => { setTransferTarget(null); setTransferBranchId(''); setTransferNotes(''); }} className="flex-1 border border-slate-200 py-2 rounded-lg text-sm">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {historyEmployee && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">Historial de Sucursales</h2>
                <p className="text-sm text-slate-500">{historyEmployee.firstName} {historyEmployee.lastName}</p>
              </div>
              <button onClick={() => setHistoryEmployee(null)} className="text-slate-400 hover:text-slate-600 text-xl font-light">×</button>
            </div>
            <div className="overflow-y-auto flex-1">
              {loadingHistory && <p className="text-sm text-slate-400 text-center py-6">Cargando...</p>}
              {!loadingHistory && history.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-6">Sin traslados registrados</p>
              )}
              {!loadingHistory && history.length > 0 && (
                <div className="relative pl-6">
                  <div className="absolute left-2 top-0 bottom-0 w-px bg-slate-200" />
                  {history.map((h, i) => (
                    <div key={h.id} className="relative mb-5 last:mb-0">
                      <span className="absolute -left-4 top-1 w-2.5 h-2.5 rounded-full bg-blue-500 border-2 border-white ring-1 ring-blue-200" />
                      <p className="text-xs text-slate-400 mb-0.5">
                        {new Date(h.createdAt).toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' })}
                        {' · '}por <span className="font-medium text-slate-600">{h.transferredByName}</span>
                      </p>
                      <p className="text-sm text-slate-700">
                        {h.fromBranchId
                          ? <><span className="font-medium">{branches.find(b => b.id === h.fromBranchId)?.name ?? h.fromBranchId}</span> → </>
                          : 'Sin sucursal → '}
                        <span className="font-medium text-blue-700">
                          {h.toBranchId ? (branches.find(b => b.id === h.toBranchId)?.name ?? h.toBranchId) : 'Sin asignar'}
                        </span>
                      </p>
                      {h.notes && <p className="text-xs text-slate-400 mt-0.5 italic">{h.notes}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>{['Nombre','Cédula','Cargo','Departamento','Salario','Estado', hasBranches ? 'Sucursal' : '', ''].map(h => h && <th key={h} className="text-left px-4 py-3 text-slate-500 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {employees.length === 0 && <tr><td colSpan={hasBranches ? 8 : 7} className="text-center py-8 text-slate-400">No hay empleados</td></tr>}
            {employees.map(emp => (
              <tr key={emp.id} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">{emp.firstName} {emp.lastName}</td>
                <td className="px-4 py-3 text-slate-500">{emp.cedula || '-'}</td>
                <td className="px-4 py-3 text-slate-500">{emp.position || '-'}</td>
                <td className="px-4 py-3 text-slate-500">{emp.department || '-'}</td>
                <td className="px-4 py-3">{emp.baseSalary ? formatCurrency(emp.baseSalary) : '-'}</td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[emp.status] ?? ''}`}>{emp.status}</span></td>
                {hasBranches && (
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {emp.branchId ? (branches.find(b => b.id === emp.branchId)?.name ?? '—') : <span className="text-slate-300">Sin asignar</span>}
                  </td>
                )}
                <td className="px-4 py-3">
                  <div className="flex gap-2 justify-end">
                    {hasBranches && (
                      <button title="Historial de sucursales" onClick={() => openHistory(emp)} className="text-slate-400 hover:text-indigo-600"><History size={15} /></button>
                    )}
                    {isMultiBranch && currentUser?.role === 'owner' && (
                      <button title="Transferir sucursal" onClick={() => { setTransferTarget(emp); setTransferBranchId(emp.branchId ?? ''); }} className="text-slate-400 hover:text-purple-600"><GitBranch size={15} /></button>
                    )}
                    <button onClick={() => { setEditing(emp); setForm({ firstName: emp.firstName, lastName: emp.lastName, cedula: emp.cedula ?? '', position: emp.position ?? '', department: emp.department ?? '', baseSalary: emp.baseSalary ? String(emp.baseSalary) : '', hireDate: '', branchId: emp.branchId ?? '' }); setShowForm(true); }} className="text-slate-400 hover:text-blue-600"><Pencil size={15} /></button>
                    <button onClick={() => remove(emp.id)} className="text-slate-400 hover:text-red-600"><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
