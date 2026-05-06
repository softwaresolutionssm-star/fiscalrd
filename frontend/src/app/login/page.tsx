'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Eye, EyeOff, Mail, Lock, Check, ArrowRight, MessageCircle } from 'lucide-react';

const FEATURES = [
  'Facturación electrónica e-CF',
  'Reportes DGII automáticos',
  'POS, inventario y nómina',
  'Multi-empresa y multi-usuario',
];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      const redirectPath = await login(email, password);
      router.replace(redirectPath);
    } catch (err: any) {
      const data = err?.response?.data;
      const msg = data?.message ?? data?.data?.message ?? 'Credenciales incorrectas';
      setErrorMsg(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden flex">

        {/* ── Panel izquierdo (branding) ─────────────────────────────── */}
        <div className="hidden md:flex flex-col justify-between w-80 flex-shrink-0 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-9 relative overflow-hidden">
          {/* Círculos decorativos */}
          <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-white/5" />
          <div className="absolute top-32 -right-8 w-32 h-32 rounded-full bg-white/5" />
          <div className="absolute -bottom-16 -left-10 w-64 h-64 rounded-full bg-white/5" />

          {/* Logo */}
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mb-5">
              <span className="text-xl font-black text-white">F</span>
            </div>
            <h1 className="text-2xl font-bold text-white leading-tight">FiscalRD</h1>
            <p className="text-blue-200 text-sm mt-1 leading-snug">
              Sistema de Facturación<br />Electrónica
            </p>
            <span className="inline-block mt-3 text-xs bg-white/20 text-blue-100 px-2.5 py-1 rounded-full font-medium">
              Ley 32-23
            </span>
          </div>

          {/* Features */}
          <div className="relative space-y-3">
            <p className="text-xs font-semibold text-blue-300 uppercase tracking-widest mb-4">
              Todo incluido
            </p>
            {FEATURES.map(f => (
              <div key={f} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Check size={11} className="text-white" strokeWidth={3} />
                </div>
                <span className="text-sm text-blue-100">{f}</span>
              </div>
            ))}
          </div>

          {/* Footer */}
          <p className="text-xs text-blue-400 relative">
            © {new Date().getFullYear()} FiscalRD
          </p>
        </div>

        {/* ── Panel derecho (formulario) ─────────────────────────────── */}
        <div className="flex-1 flex flex-col justify-center px-10 py-10">
          {/* Logo móvil */}
          <div className="md:hidden text-center mb-6">
            <span className="text-2xl font-bold text-blue-600">FiscalRD</span>
            <p className="text-xs text-slate-400 mt-0.5">Sistema de Facturación Electrónica</p>
          </div>

          <div className="max-w-sm mx-auto w-full">
            <h2 className="text-xl font-bold text-slate-800">Iniciar sesión</h2>
            <p className="text-sm text-slate-500 mt-1 mb-7">Ingresa tus credenciales para continuar</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">
                  Correo electrónico
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setErrorMsg(''); }}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="usuario@empresa.com"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Contraseña */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-700">Contraseña</label>
                  <Link
                    href="/forgot-password"
                    className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setErrorMsg(''); }}
                    className="w-full pl-10 pr-11 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    tabIndex={-1}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {errorMsg && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-3.5 py-3">
                  <span className="text-red-400 mt-px">⚠</span>
                  {errorMsg}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-semibold text-sm py-2.5 rounded-xl transition-all shadow-sm shadow-blue-200 disabled:opacity-60 disabled:cursor-not-allowed mt-1"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Iniciando sesión...
                  </>
                ) : (
                  <>
                    Iniciar sesión
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </form>

            {/* Links */}
            <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col items-center gap-2.5">
              <Link
                href="/"
                className="text-sm text-slate-400 hover:text-blue-600 transition-colors"
              >
                Ver características y precios →
              </Link>
              <a
                href="https://wa.me/18096628402?text=Hola%2C%20quiero%20informaci%C3%B3n%20sobre%20FiscalRD"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
              >
                <MessageCircle size={14} />
                ¿No tienes cuenta? Contáctanos
              </a>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
