'use client';

import { useAuth } from '@/contexts/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Building2, Users, Settings, LogOut, Activity,
  CreditCard, BarChart3,
} from 'lucide-react';

const navItems = [
  { href: '/admin',             label: 'Dashboard',      icon: LayoutDashboard },
  { href: '/admin/tenants',     label: 'Negocios',        icon: Building2 },
  { href: '/admin/users',       label: 'Usuarios',        icon: Users },
  { href: '/admin/planes',      label: 'Planes',          icon: BarChart3 },
  { href: '/admin/facturacion', label: 'Facturación',     icon: CreditCard },
  { href: '/admin/logs',        label: 'Actividad',       icon: Activity },
  { href: '/admin/settings',    label: 'Configuración',   icon: Settings },
];

function AdminSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col h-screen fixed left-0 top-0">
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-xl font-bold text-red-400">FiscalRD</h1>
        <p className="text-xs text-slate-400 mt-1">Panel de Administración</p>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-red-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-700">
        <p className="text-xs text-slate-300 font-medium mb-0.5">
          {user?.firstName} {user?.lastName}
        </p>
        <p className="text-xs text-slate-500 mb-3">{user?.email}</p>
        <button
          onClick={logout}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors w-full"
        >
          <LogOut size={16} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.role !== 'super_admin') {
      router.replace('/dashboard');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
      </div>
    );
  }

  if (!user || user.role !== 'super_admin') return null;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AdminSidebar />
      <main className="flex-1 ml-64 p-8">{children}</main>
    </div>
  );
}
