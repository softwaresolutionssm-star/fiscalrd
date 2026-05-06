'use client';

import { useAuth } from '@/contexts/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { LogOut, Monitor, ShoppingCart, Landmark, LayoutDashboard, CalendarDays } from 'lucide-react';
import { ChatBot } from '@/components/chatbot/ChatBot';

export default function PosLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.replace('/login'); return; }
    if (user.role === 'super_admin') { router.replace('/admin'); return; }
    if (user.role === 'employee') { router.replace('/employee'); return; }
    if (!['cashier', 'owner', 'admin'].includes(user.role)) { router.replace('/dashboard'); }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400" />
      </div>
    );
  }

  if (!user || !['cashier', 'owner', 'admin'].includes(user.role)) return null;

  const navLinks = [
    { href: '/pos',            label: 'Vender',     icon: ShoppingCart },
    { href: '/pos/caja',       label: 'Caja',       icon: Landmark },
    { href: '/employee/schedule', label: 'Mi Horario', icon: CalendarDays },
    ...(user.role !== 'cashier' ? [{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }] : []),
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      {/* POS Header */}
      <header className="h-14 bg-slate-900 text-white flex items-center justify-between px-6 flex-shrink-0 shadow-lg z-10">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Monitor size={20} className="text-blue-400" />
            <span className="font-bold text-lg text-blue-400">FiscalRD</span>
            <span className="text-slate-500 text-sm ml-1">POS</span>
          </div>
          {/* Nav */}
          <nav className="flex items-center gap-1">
            {navLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors',
                  pathname === href
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                )}
              >
                <Icon size={14} />
                {label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-300">{user.firstName} {user.lastName}</span>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <LogOut size={15} />
            Salir
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {children}
      </div>
      <ChatBot />
    </div>
  );
}
