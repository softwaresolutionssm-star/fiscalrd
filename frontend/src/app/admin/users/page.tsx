'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { PageHeader } from '@/components/ui/page-header';
import { Search, UserCheck, UserX, KeyRound, X, LockOpen, Lock } from 'lucide-react';
import { useConfirm } from '@/components/ui/confirm-dialog';

interface TenantUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  isLocked: boolean;
  tenantId: string;
  tenantName?: string;
}

const roleLabels: Record<string, string> = {
  super_admin: 'Super Admin', owner: 'Dueño', admin: 'Admin',
  cashier: 'Cajero', employee: 'Empleado', accountant: 'Contador',
};
const roleColors: Record<string, string> = {
  super_admin: 'bg-red-100 text-red-700', owner: 'bg-purple-100 text-purple-700',
  admin: 'bg-blue-100 text-blue-700', cashier: 'bg-green-100 text-green-700',
  employee: 'bg-slate-100 text-slate-600', accountant: 'bg-yellow-100 text-yellow-700',
};

interface ResetPasswordModal {
  open: boolean;
  userId: string;
  userName: string;
}

export default function AdminUsersPage() {
  const confirm = useConfirm();
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [resetModal, setResetModal] = useState<ResetPasswordModal>({ open: false, userId: '', userName: '' });
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const tenantsRes = await api.get('/admin/tenants');
        const allTenants = tenantsRes.data.data ?? tenantsRes.data;

        const allUsers: TenantUser[] = [];
        for (const t of allTenants) {
          const usersRes = await api.get(`/admin/tenants/${t.id}/users`);
          const tenantUsers = usersRes.data.data ?? usersRes.data;
tenantUsers.forEach((u: TenantUser) => allUsers.push({ ...u, tenantName: t.businessName }));
        }
        setUsers(allUsers);
      } catch {
        toast.error('Error cargando usuarios');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = users.filter(u =>
    !search ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    `${u.firstName} ${u.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
    (u.tenantName ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const openResetModal = (user: TenantUser) => {
    setNewPassword('');
    setConfirmPassword('');
    setResetModal({ open: true, userId: user.id, userName: `${user.firstName} ${user.lastName}` });
  };

  const closeResetModal = () => {
    setResetModal({ open: false, userId: '', userName: '' });
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleUnlock = async (userId: string, userName: string) => {
    if (!await confirm({ title: 'Desbloquear cuenta', message: `¿Desbloquear la cuenta de ${userName}?`, confirmText: 'Desbloquear', variant: 'warning' })) return;
    try {
      await api.patch(`/users/${userId}/unlock`);
      toast.success('Cuenta desbloqueada');
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, isLocked: false } : u));
    } catch {
      toast.error('Error al desbloquear');
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    setResetting(true);
    try {
      await api.patch(`/admin/users/${resetModal.userId}/reset-password`, { newPassword });
      toast.success('Contraseña actualizada correctamente');
      closeResetModal();
    } catch {
      toast.error('Error al actualizar contraseña');
    } finally {
      setResetting(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
    </div>
  );

  return (
    <div>
      <PageHeader title="Usuarios" description={`${users.length} usuarios en la plataforma`} />

      <div className="mb-4 max-w-sm relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por nombre, email o negocio..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="text-left px-5 py-3 text-slate-500 font-medium">Usuario</th>
              <th className="text-left px-5 py-3 text-slate-500 font-medium">Email</th>
              <th className="text-left px-5 py-3 text-slate-500 font-medium">Negocio</th>
              <th className="text-left px-5 py-3 text-slate-500 font-medium">Rol</th>
              <th className="text-center px-5 py-3 text-slate-500 font-medium">Estado</th>
              <th className="text-center px-5 py-3 text-slate-500 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="text-center py-10 text-slate-400">No se encontraron usuarios</td></tr>
            )}
            {filtered.map(u => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="px-5 py-3 font-medium text-slate-800">{u.firstName} {u.lastName}</td>
                <td className="px-5 py-3 text-slate-500">{u.email}</td>
                <td className="px-5 py-3 text-slate-500">{u.tenantName ?? '—'}</td>
                <td className="px-5 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleColors[u.role] ?? 'bg-slate-100 text-slate-600'}`}>
                    {roleLabels[u.role] ?? u.role}
                  </span>
                </td>
                <td className="px-5 py-3 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    {u.isActive
                      ? <UserCheck size={16} className="text-green-500" />
                      : <UserX size={16} className="text-red-400" />}
                    {u.isLocked && (
                      <span className="flex items-center gap-0.5 text-xs text-red-600 font-medium">
                        <Lock size={12} /> Bloqueado
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-5 py-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    {u.isLocked && (
                      <button
                        onClick={() => handleUnlock(u.id, `${u.firstName} ${u.lastName}`)}
                        className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
                      >
                        <LockOpen size={12} /> Desbloquear
                      </button>
                    )}
                    <button
                      onClick={() => openResetModal(u)}
                      className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
                    >
                      <KeyRound size={12} />
                      Reset Password
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ─── Reset Password Modal ─────────────────────────────── */}
      {resetModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 mx-4">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">Resetear Contraseña</h2>
                <p className="text-sm text-slate-500 mt-0.5">{resetModal.userName}</p>
              </div>
              <button onClick={closeResetModal} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nueva Contraseña</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Confirmar Contraseña</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repetir contraseña"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30"
                  onKeyDown={e => e.key === 'Enter' && handleResetPassword()}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={closeResetModal}
                className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleResetPassword}
                disabled={resetting}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {resetting ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <KeyRound size={14} />}
                {resetting ? 'Actualizando...' : 'Actualizar Contraseña'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
