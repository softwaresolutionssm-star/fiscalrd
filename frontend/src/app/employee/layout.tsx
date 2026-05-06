'use client';

import { useAuth } from '@/contexts/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ClipboardList, User, DollarSign, LogOut, CalendarDays } from 'lucide-react';

const navItems = [
  { href: '/employee', label: 'Mis Órdenes', icon: ClipboardList },
  { href: '/employee/schedule', label: 'Mi Horario', icon: CalendarDays },
  { href: '/employee/profile', label: 'Mi Perfil', icon: User },
  { href: '/employee/payroll', label: 'Mi Nómina', icon: DollarSign },
];

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    // Solo super_admin no tiene portal de empleado
    if (user.role === 'super_admin') {
      router.replace('/admin');
      return;
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!user || user.role === 'super_admin') return null;

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-60 bg-slate-900 text-white flex flex-col h-screen fixed left-0 top-0">
        {/* Branding */}
        <div className="p-6 border-b border-slate-700">
          <h1 className="text-lg font-bold text-blue-400">FiscalRD</h1>
          <p className="text-xs text-slate-400 mt-0.5">Portal del Empleado</p>
        </div>

        {/* Avatar + name */}
        <div className="px-4 py-5 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
              {user.firstName?.[0]}{user.lastName?.[0]}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs text-slate-400 truncate">{user.email}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = href === '/employee' ? pathname === '/employee' : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm transition-colors',
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                )}
              >
                <Icon size={18} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-slate-700">
          <button
            onClick={logout}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors w-full"
          >
            <LogOut size={16} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 ml-60 p-8">{children}</main>
    </div>
  );
}
