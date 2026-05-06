'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, LockOpen, Lock, GitBranch, KeyRound, ShieldCheck } from 'lucide-react';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useBranch } from '@/contexts/branch-context';
import { useAuth } from '@/contexts/auth-context';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  isLocked: boolean;
  loginAttempts: number;
  branchId?: string | null;
  permissions?: string[] | null;
}

const ROLES = [
  { value: 'admin',     label: 'Administrador',            desc: 'Acceso total al negocio' },
  { value: 'manager',   label: 'Encargado de Sucursal',    desc: 'Operaciones + RR.HH. + Nómina' },
  { value: 'accountant',label: 'Contador',                 desc: 'Finanzas, contabilidad y DGII' },
  { value: 'cashier',   label: 'Cajero',                   desc: 'Solo punto de venta (POS)' },
  { value: 'employee',  label: 'Empleado',                 desc: 'Solo su portal personal' },
];

const roleColor: Record<string, string> = {
  super_admin: 'bg-purple-100 text-purple-700',
  owner: 'bg-indigo-100 text-indigo-700',
  admin: 'bg-blue-100 text-blue-700',
  manager: 'bg-teal-100 text-teal-700',
  accountant: 'bg-green-100 text-green-700',
  cashier: 'bg-slate-100 text-slate-600',
  employee: 'bg-orange-100 text-orange-700',
};

const roleLabel: Record<string, string> = {
  super_admin: 'Super Admin',
  owner: 'Dueño',
  admin: 'Administrador',
  manager: 'Encargado',
  accountant: 'Contador',
  cashier: 'Cajero',
  employee: 'Empleado',
};

const AVAILABLE_PERMISSIONS = [
  { key: 'manage_users',    label: 'Gestionar usuarios',         desc: 'Puede crear y editar usuarios de su sucursal' },
  { key: 'reset_passwords', label: 'Restablecer contraseñas',    desc: 'Puede cambiar la contraseña de otros usuarios' },
];

const emptyForm = { email: '', password: '', firstName: '', lastName: '', role: 'cashier', branchId: '' };
const emptyEmp = { cedula: '', position: '', baseSalary: '' };

export default function UsersPage() {
  const confirm = useConfirm();
  const { user: currentUser, refreshUser } = useAuth();
  const { branches, isMultiBranch, hasBranches } = useBranch();
  const [users, setUsers] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [empForm, setEmpForm] = useState(emptyEmp);
  const [showEmpSection, setShowEmpSection] = useState(false);
  const [transferTarget, setTransferTarget] = useState<User | null>(null);
  const [transferBranchId, setTransferBranchId] = useState('');

  // Permissions management
  const [permTarget, setPermTarget] = useState<User | null>(null);
  const [permSelected, setPermSelected] = useState<string[]>([]);

  // Reset password
  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const canManageUsers = currentUser?.role === 'owner' || currentUser?.role === 'admin' || currentUser?.role === 'super_admin'
    || (currentUser?.role === 'manager' && currentUser?.permissions?.includes('manage_users'));
  const canResetPasswords = currentUser?.role === 'owner' || currentUser?.role === 'admin' || currentUser?.role === 'super_admin'
    || (currentUser?.role === 'manager' && currentUser?.permissions?.includes('reset_passwords'));
  const canManagePermissions = currentUser?.role === 'owner' || currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  const load = () => api.get('/users').then(r => setUsers(r.data.data ?? [])).catch(() => null);
  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setEmpForm(emptyEmp);
    setShowEmpSection(false);
    setEditing(null);
    setShowForm(false);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        const { password, branchId, ...rest } = form;
        const updatePayload: any = password ? { ...form } : rest;
        if (branchId) updatePayload.branchId = branchId;
        await api.patch(`/users/${editing.id}`, updatePayload);
        toast.success('Usuario actualizado');
      } else {
        const payload: any = {
          email: form.email,
          password: form.password,
          firstName: form.firstName,
          lastName: form.lastName,
          role: form.role,
        };
        if (form.branchId) payload.branchId = form.branchId;
        if (showEmpSection && (empForm.cedula || empForm.position || empForm.baseSalary)) {
          if (empForm.cedula) payload.cedula = empForm.cedula;
          if (empForm.position) payload.position = empForm.position;
          if (empForm.baseSalary) payload.baseSalary = parseFloat(empForm.baseSalary);
        }
        await api.post('/users', payload);
        toast.success(showEmpSection && (empForm.cedula || empForm.position || empForm.baseSalary)
          ? 'Usuario y empleado creados correctamente'
          : 'Usuario creado');
      }
      resetForm();
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Error al guardar usuario');
    }
  };

  const remove = async (id: string) => {
    if (!await confirm({ title: 'Eliminar usuario', message: '¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer.', confirmText: 'Eliminar' })) return;
    try { await api.delete(`/users/${id}`); toast.success('Usuario eliminado'); load(); } catch { toast.error('Error'); }
  };

  const doTransfer = async () => {
    if (!transferTarget) return;
    try {
      await api.patch(`/users/${transferTarget.id}/transfer-branch`, { branchId: transferBranchId || null });
      toast.success('Usuario reasignado correctamente');
      setTransferTarget(null); setTransferBranchId(''); load();
    } catch { toast.error('Error al reasignar'); }
  };

  const unlock = async (id: string, name: string) => {
    if (!await confirm({ title: 'Desbloquear cuenta', message: `¿Desbloquear la cuenta de ${name}?`, confirmText: 'Desbloquear', variant: 'warning' })) return;
    try { await api.patch(`/users/${id}/unlock`); toast.success('Cuenta desbloqueada'); load(); } catch { toast.error('Error al desbloquear'); }
  };

  const savePermissions = async () => {
    if (!permTarget) return;
    try {
      await api.patch(`/users/${permTarget.id}/permissions`, { permissions: permSelected });
      toast.success('Permisos actualizados');
      setPermTarget(null);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Error al actualizar permisos');
    }
  };

  const doResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget) return;
    try {
      await api.post(`/users/${resetTarget.id}/admin-reset-password`, { newPassword });
      toast.success('Contraseña actualizada correctamente');
      setResetTarget(null);
      setNewPassword('');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Error al actualizar contraseña');
    }
  };

  return (
    <div>
      <PageHeader title="Usuarios" description="Gestión de usuarios del sistema"
        action={canManageUsers
          ? <button onClick={() => { setShowForm(true); setEditing(null); }} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"><Plus size={16} /> Nuevo Usuario</button>
          : undefined
        }
      />

      {/* ── Modal: Crear / Editar usuario ─────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <form onSubmit={save} className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">{editing ? 'Editar' : 'Nuevo'} Usuario</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input required placeholder="Nombre *" value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                <input required placeholder="Apellido *" value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <input required={!editing} type="email" placeholder="Email *" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              <input type="password" placeholder={editing ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña *'} required={!editing} value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
              {form.role && (
                <p className="text-xs text-slate-400 -mt-1 px-1">
                  {ROLES.find(r => r.value === form.role)?.desc}
                </p>
              )}
              {currentUser?.role === 'owner' && hasBranches && (
                <select value={form.branchId} onChange={e => setForm({...form, branchId: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                  <option value="">Sin sucursal asignada (acceso general)</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              )}
            </div>

            {/* Sección Empleado — solo al crear */}
            {!editing && (
              <div className="mt-4 border border-slate-200 rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowEmpSection(v => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 bg-slate-50"
                >
                  <span>Datos de empleado (opcional)</span>
                  {showEmpSection ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {showEmpSection && (
                  <div className="p-4 space-y-3 border-t border-slate-200">
                    <p className="text-xs text-slate-400">Si completas estos datos, se creará automáticamente un registro de empleado vinculado a este usuario para gestionar su nómina.</p>
                    <input placeholder="Cédula (11 dígitos)" value={empForm.cedula} onChange={e => setEmpForm({...empForm, cedula: e.target.value.replace(/\D/g, '').slice(0, 11)})} maxLength={11} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono" />
                    <input placeholder="Cargo / Puesto" value={empForm.position} onChange={e => setEmpForm({...empForm, position: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                    <input type="number" step="0.01" min="0" placeholder="Salario base (RD$)" value={empForm.baseSalary} onChange={e => setEmpForm({...empForm, baseSalary: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm">Guardar</button>
              <button type="button" onClick={resetForm} className="flex-1 border border-slate-200 py-2 rounded-lg text-sm">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* ── Modal: Reasignar sucursal ─────────────────────────────── */}
      {transferTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-lg font-semibold mb-1">Reasignar Sucursal</h2>
            <p className="text-sm text-slate-500 mb-4">Asignar <strong>{transferTarget.firstName} {transferTarget.lastName}</strong> a otra sucursal</p>
            <select
              value={transferBranchId}
              onChange={e => setTransferBranchId(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-4"
            >
              <option value="">Sin sucursal asignada (acceso general)</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <div className="flex gap-2">
              <button onClick={doTransfer} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium">Confirmar</button>
              <button onClick={() => { setTransferTarget(null); setTransferBranchId(''); }} className="flex-1 border border-slate-200 py-2 rounded-lg text-sm">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Gestionar permisos ─────────────────────────────── */}
      {permTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-lg font-semibold mb-1">Permisos adicionales</h2>
            <p className="text-sm text-slate-500 mb-4">
              Configura qué puede hacer <strong>{permTarget.firstName} {permTarget.lastName}</strong>
            </p>
            <div className="space-y-3 mb-5">
              {AVAILABLE_PERMISSIONS.map(p => (
                <label key={p.key} className="flex items-start gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={permSelected.includes(p.key)}
                    onChange={e => {
                      if (e.target.checked) setPermSelected(prev => [...prev, p.key]);
                      else setPermSelected(prev => prev.filter(x => x !== p.key));
                    }}
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-700">{p.label}</p>
                    <p className="text-xs text-slate-400">{p.desc}</p>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={savePermissions} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium">Guardar</button>
              <button onClick={() => setPermTarget(null)} className="flex-1 border border-slate-200 py-2 rounded-lg text-sm">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Restablecer contraseña ────────────────────────── */}
      {resetTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <form onSubmit={doResetPassword} className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-lg font-semibold mb-1">Restablecer contraseña</h2>
            <p className="text-sm text-slate-500 mb-4">
              Nueva contraseña para <strong>{resetTarget.firstName} {resetTarget.lastName}</strong>
            </p>
            <input
              type="password"
              placeholder="Nueva contraseña (mín. 6 caracteres)"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
              minLength={6}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-4"
            />
            <div className="flex gap-2">
              <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium">Actualizar</button>
              <button type="button" onClick={() => { setResetTarget(null); setNewPassword(''); }} className="flex-1 border border-slate-200 py-2 rounded-lg text-sm">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>{['Nombre','Email','Rol','Estado', hasBranches ? 'Sucursal' : '', ''].filter(Boolean).map(h => <th key={h} className="text-left px-4 py-3 text-slate-500 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {users.length === 0 && <tr><td colSpan={hasBranches ? 6 : 5} className="text-center py-8 text-slate-400">No hay usuarios</td></tr>}
            {users.map(u => (
              <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">{u.firstName} {u.lastName}</td>
                <td className="px-4 py-3 text-slate-500">{u.email}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleColor[u.role] ?? 'bg-slate-100 text-slate-600'}`}>{roleLabel[u.role] ?? u.role}</span>
                    {u.role === 'manager' && u.permissions && u.permissions.length > 0 && (
                      <span title={u.permissions.map(p => AVAILABLE_PERMISSIONS.find(x => x.key === p)?.label ?? p).join(', ')} className="text-teal-500">
                        <ShieldCheck size={13} />
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{u.isActive ? 'Activo' : 'Inactivo'}</span>
                    {u.isLocked && <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700"><Lock size={10} /> Bloqueado</span>}
                  </div>
                </td>
                {hasBranches && (
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {u.branchId ? (branches.find(b => b.id === u.branchId)?.name ?? '—') : <span className="text-slate-300">General</span>}
                  </td>
                )}
                <td className="px-4 py-3">
                  <div className="flex gap-2 justify-end">
                    {u.isLocked && (
                      <button onClick={() => unlock(u.id, `${u.firstName} ${u.lastName}`)} className="text-amber-500 hover:text-amber-700" title="Desbloquear cuenta">
                        <LockOpen size={15} />
                      </button>
                    )}
                    {/* Restablecer contraseña */}
                    {canResetPasswords && u.id !== currentUser?.id && u.role !== 'owner' && (
                      <button
                        title="Restablecer contraseña"
                        onClick={() => setResetTarget(u)}
                        className="text-slate-400 hover:text-amber-600"
                      >
                        <KeyRound size={15} />
                      </button>
                    )}
                    {/* Gestionar permisos — solo managers */}
                    {canManagePermissions && u.role === 'manager' && (
                      <button
                        title="Permisos adicionales"
                        onClick={() => { setPermTarget(u); setPermSelected(u.permissions ?? []); }}
                        className="text-slate-400 hover:text-teal-600"
                      >
                        <ShieldCheck size={15} />
                      </button>
                    )}
                    {isMultiBranch && currentUser?.role === 'owner' && u.role !== 'owner' && (
                      <button title="Reasignar sucursal" onClick={() => { setTransferTarget(u); setTransferBranchId(u.branchId ?? ''); }} className="text-slate-400 hover:text-purple-600"><GitBranch size={15} /></button>
                    )}
                    {canManageUsers && u.id !== currentUser?.id && u.role !== 'owner' && (
                      <button onClick={() => { setEditing(u); setForm({ email: u.email, password: '', firstName: u.firstName, lastName: u.lastName, role: u.role, branchId: u.branchId ?? '' }); setShowForm(true); }} className="text-slate-400 hover:text-blue-600"><Pencil size={15} /></button>
                    )}
                    {(currentUser?.role === 'owner' || currentUser?.role === 'super_admin') && u.role !== 'owner' && (
                      <button onClick={() => remove(u.id)} className="text-slate-400 hover:text-red-600"><Trash2 size={15} /></button>
                    )}
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
