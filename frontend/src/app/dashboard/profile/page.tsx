'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import api from '@/lib/api';
import { toast } from 'sonner';
import { PageHeader } from '@/components/ui/page-header';
import { User, Mail, Shield, Lock, Eye, EyeOff, CheckCircle2, Smartphone, X } from 'lucide-react';

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  owner:       { label: 'Propietario',    color: 'bg-green-100 text-green-700' },
  admin:       { label: 'Administrador',  color: 'bg-blue-100 text-blue-700' },
  accountant:  { label: 'Contador',       color: 'bg-teal-100 text-teal-700' },
  cashier:     { label: 'Cajero',         color: 'bg-amber-100 text-amber-700' },
  employee:    { label: 'Empleado',       color: 'bg-purple-100 text-purple-700' },
  super_admin: { label: 'Super Admin',    color: 'bg-red-100 text-red-700' },
};

export default function ProfilePage() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);

  // 2FA state
  const [twoFAEnabled, setTwoFAEnabled] = useState(!!(user as any)?.twoFactorEnabled);
  const [twoFASetup, setTwoFASetup] = useState<{ qrCode: string; secret: string } | null>(null);
  const [twoFAToken, setTwoFAToken] = useState('');
  const [twoFALoading, setTwoFALoading] = useState(false);
  const [showDisable2FA, setShowDisable2FA] = useState(false);

  if (!user) return null;

  const roleInfo = ROLE_LABELS[user.role] ?? { label: user.role, color: 'bg-slate-100 text-slate-600' };
  const initials = `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase();

  async function handleSetup2FA() {
    setTwoFALoading(true);
    try {
      const r = await api.post('/auth/2fa/setup');
      const d = r.data?.data ?? r.data;
      setTwoFASetup({ qrCode: d.qrCode, secret: d.secret });
      setTwoFAToken('');
    } catch { toast.error('Error al generar el código QR'); }
    finally { setTwoFALoading(false); }
  }

  async function handleEnable2FA() {
    if (twoFAToken.length !== 6) { toast.error('Ingresa el código de 6 dígitos'); return; }
    setTwoFALoading(true);
    try {
      await api.post('/auth/2fa/enable', { token: twoFAToken });
      toast.success('2FA activado correctamente');
      setTwoFAEnabled(true);
      setTwoFASetup(null);
      setTwoFAToken('');
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Código incorrecto');
    } finally { setTwoFALoading(false); }
  }

  async function handleDisable2FA() {
    if (twoFAToken.length !== 6) { toast.error('Ingresa el código de 6 dígitos'); return; }
    setTwoFALoading(true);
    try {
      await api.post('/auth/2fa/disable', { token: twoFAToken });
      toast.success('2FA desactivado');
      setTwoFAEnabled(false);
      setShowDisable2FA(false);
      setTwoFAToken('');
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Código incorrecto');
    } finally { setTwoFALoading(false); }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) { toast.error('La nueva contraseña debe tener al menos 6 caracteres'); return; }
    if (newPassword !== confirmPassword) { toast.error('Las contraseñas no coinciden'); return; }
    setSaving(true);
    try {
      await api.patch('/auth/change-password', { currentPassword, newPassword });
      toast.success('Contraseña actualizada correctamente');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Error al cambiar contraseña');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader title="Mi Perfil" description="Información de tu cuenta y configuración de acceso" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─ Info card ─ */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          {/* Avatar */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-2xl font-bold text-white mb-3">
              {initials}
            </div>
            <h2 className="text-lg font-bold text-slate-800">{user.firstName} {user.lastName}</h2>
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mt-1 ${roleInfo.color}`}>
              {roleInfo.label}
            </span>
          </div>

          {/* Fields */}
          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
                <User size={12} /> Nombre
              </label>
              <div className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700">
                {user.firstName} {user.lastName}
              </div>
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
                <Mail size={12} /> Email
              </label>
              <div className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 break-all">
                {user.email}
              </div>
            </div>
            {user.businessName && (
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
                  <Shield size={12} /> Negocio
                </label>
                <div className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700">
                  {user.businessName}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─ Change password ─ */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h3 className="font-semibold text-slate-800 mb-5 flex items-center gap-2">
            <Lock size={16} className="text-slate-400" /> Cambiar Contraseña
          </h3>
          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Contraseña actual</label>
              <div className="relative">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 pr-10 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
                <button type="button" onClick={() => setShowCurrent(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Nueva contraseña</label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-3 py-2.5 pr-10 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
                <button type="button" onClick={() => setShowNew(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {/* Strength indicator */}
              {newPassword && (
                <div className="mt-2 flex gap-1">
                  {[1,2,3,4].map(i => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${
                      newPassword.length >= i * 3
                        ? i <= 2 ? 'bg-red-400' : i === 3 ? 'bg-yellow-400' : 'bg-green-500'
                        : 'bg-slate-200'
                    }`} />
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirmar nueva contraseña</label>
              <div className="relative">
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Repite la contraseña"
                  className="w-full px-3 py-2.5 pr-10 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
                {confirmPassword && newPassword === confirmPassword && (
                  <CheckCircle2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500" />
                )}
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving || !currentPassword || !newPassword || !confirmPassword}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Guardando...' : 'Actualizar Contraseña'}
              </button>
            </div>
          </form>

          {/* ── 2FA Section ──────────────────────────────────────────────── */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="flex items-center gap-2 mb-4">
              <Smartphone size={18} className="text-slate-600" />
              <h3 className="text-base font-semibold text-slate-800">Autenticación de Dos Factores (2FA)</h3>
              {twoFAEnabled && (
                <span className="ml-auto px-2.5 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full flex items-center gap-1">
                  <CheckCircle2 size={11} /> Activo
                </span>
              )}
            </div>

            {!twoFAEnabled && !twoFASetup && (
              <div className="space-y-3">
                <p className="text-sm text-slate-500">Protege tu cuenta con una capa extra de seguridad. Necesitarás una app como <strong>Google Authenticator</strong> o <strong>Authy</strong>.</p>
                <button onClick={handleSetup2FA} disabled={twoFALoading}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
                  {twoFALoading ? 'Generando...' : 'Activar 2FA'}
                </button>
              </div>
            )}

            {!twoFAEnabled && twoFASetup && (
              <div className="space-y-4">
                <p className="text-sm text-slate-600">Escanea el código QR con tu app de autenticación y luego ingresa el código de 6 dígitos para confirmar.</p>
                <div className="flex justify-center">
                  <img src={twoFASetup.qrCode} alt="QR 2FA" className="w-44 h-44 rounded-xl border border-slate-200" />
                </div>
                <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-500 font-mono text-center break-all">
                  Clave manual: {twoFASetup.secret}
                </div>
                <div className="flex gap-2">
                  <input
                    placeholder="Código de 6 dígitos"
                    value={twoFAToken}
                    onChange={e => setTwoFAToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="flex-1 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-center tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                  <button onClick={handleEnable2FA} disabled={twoFALoading || twoFAToken.length !== 6}
                    className="px-5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors">
                    {twoFALoading ? '...' : 'Verificar'}
                  </button>
                  <button onClick={() => setTwoFASetup(null)} className="px-3 text-slate-400 hover:text-slate-600">
                    <X size={18} />
                  </button>
                </div>
              </div>
            )}

            {twoFAEnabled && !showDisable2FA && (
              <div className="space-y-3">
                <p className="text-sm text-slate-500">Tu cuenta está protegida con autenticación de dos factores.</p>
                <button onClick={() => setShowDisable2FA(true)}
                  className="px-5 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors">
                  Desactivar 2FA
                </button>
              </div>
            )}

            {twoFAEnabled && showDisable2FA && (
              <div className="space-y-3">
                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">Ingresa el código de tu app para confirmar que quieres desactivar el 2FA.</p>
                <div className="flex gap-2">
                  <input
                    placeholder="Código de 6 dígitos"
                    value={twoFAToken}
                    onChange={e => setTwoFAToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="flex-1 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-center tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-red-500/30"
                  />
                  <button onClick={handleDisable2FA} disabled={twoFALoading || twoFAToken.length !== 6}
                    className="px-5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                    {twoFALoading ? '...' : 'Confirmar'}
                  </button>
                  <button onClick={() => { setShowDisable2FA(false); setTwoFAToken(''); }} className="px-3 text-slate-400 hover:text-slate-600">
                    <X size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Security tips */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Consejos de Seguridad</p>
            <ul className="space-y-1.5 text-sm text-slate-500">
              <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span> Usa al menos 8 caracteres con letras y números</li>
              <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span> No compartas tu contraseña con nadie</li>
              <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span> Cambia tu contraseña cada 3 meses</li>
              <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span> Activa el 2FA para mayor protección</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
