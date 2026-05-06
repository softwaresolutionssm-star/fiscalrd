'use client';

import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Sidebar } from './sidebar';
import { LogOut, AlertTriangle, Menu, CreditCard, X } from 'lucide-react';
import { ChatBot } from '@/components/chatbot/ChatBot';
import api from '@/lib/api';
import Link from 'next/link';

function ImpersonationBanner() {
  const router = useRouter();
  const { } = useAuth();
  const [tenantName, setTenantName] = useState('');

  useEffect(() => {
    const name = localStorage.getItem('impersonate_tenant_name') ?? '';
    setTenantName(name);
  }, []);

  const exitImpersonation = () => {
    const originalToken = localStorage.getItem('impersonate_original_token');
    const originalUser = localStorage.getItem('impersonate_original_user');

    if (originalToken) localStorage.setItem('token', originalToken);
    if (originalUser) localStorage.setItem('user', originalUser);

    localStorage.removeItem('is_impersonating');
    localStorage.removeItem('impersonate_original_token');
    localStorage.removeItem('impersonate_original_user');
    localStorage.removeItem('impersonate_tenant_name');

    // Force page reload so auth context re-reads from localStorage
    window.location.href = '/admin/tenants';
  };

  return (
    <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-between text-sm font-medium shadow-md">
      <div className="flex items-center gap-2">
        <AlertTriangle size={16} />
        <span>
          Modo impersonación activo — estás viendo como <strong>{tenantName}</strong>
        </span>
      </div>
      <button
        onClick={exitImpersonation}
        className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 transition-colors px-3 py-1 rounded-lg text-xs font-semibold"
      >
        <LogOut size={13} />
        Salir de impersonación
      </button>
    </div>
  );
}

type AlertType = 'info' | 'warning' | 'overdue' | 'blocked';
type BillingAlert = { type: AlertType; message: string; total?: number; dueDate?: string } | null;

function useBillingAlert(role?: string): BillingAlert {
  const [alert, setAlert] = useState<BillingAlert>(null);

  useEffect(() => {
    if (!role || !['owner', 'admin'].includes(role)) return;
    api.get('/billing/my').then(r => {
      const data: any = r.data?.data ?? r.data;
      const tenant = data?.tenant;
      const currentPayments: any[] = data?.currentPayments ?? (data?.currentPayment ? [data.currentPayment] : []);
      if (!tenant) return;

      // 1. Bloqueado — prioridad máxima
      if (tenant.isBillingBlocked) {
        setAlert({ type: 'blocked', message: 'Tu cuenta está bloqueada por falta de pago. Regulariza para continuar operando.' });
        return;
      }

      if (currentPayments.length === 0) return;

      // Total combinado de todos los pagos del período actual
      const periodTotal = currentPayments.reduce((s: number, p: any) => s + Number(p.totalAmount), 0);
      const firstPayment = currentPayments[0];
      const period = firstPayment.period;
      const today = new Date().getDate();
      const dueLabel = firstPayment.dueDate
        ? new Date(firstPayment.dueDate).toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' })
        : '';

      // Estado efectivo: si alguno es overdue/rejected/pending → eso manda
      const hasOverdue   = currentPayments.some((p: any) => p.status === 'overdue');
      const hasRejected  = currentPayments.some((p: any) => p.status === 'rejected');
      const hasPending   = currentPayments.some((p: any) => p.status === 'pending');
      const allSubmitted = currentPayments.every((p: any) => p.status === 'submitted');

      // 2. Vencido con recargo
      if (hasOverdue) {
        setAlert({ type: 'overdue', message: `Pago del período ${period} vencido — recargo 10% aplicado. Vence: ${dueLabel}.`, total: periodTotal });
        return;
      }

      // 3. Rechazado
      if (hasRejected) {
        setAlert({ type: 'overdue', message: `Tu comprobante del período ${period} fue rechazado. Sube uno nuevo antes del ${dueLabel}.`, total: periodTotal });
        return;
      }

      // 4. Meses anteriores vencidos sin pagar
      const now2 = new Date();
      const allHistory: any[] = data?.history ?? [];
      const overdueOld = allHistory
        .filter((p: any) => ['pending', 'overdue', 'rejected'].includes(p.status) && new Date(p.dueDate) < now2)
        .sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

      if (overdueOld.length > 0) {
        const oldest = overdueOld[0];
        const oldDue = new Date(oldest.dueDate).toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' });
        // Sumar por período para no contar cada sucursal como un "mes" diferente
        const periodsSet = new Set(overdueOld.map((p: any) => p.period));
        const totalOverdue = overdueOld.reduce((s: number, p: any) => s + Number(p.totalAmount), 0);
        setAlert({
          type: 'overdue',
          message: `Tienes ${periodsSet.size} mes${periodsSet.size > 1 ? 'es' : ''} vencido${periodsSet.size > 1 ? 's' : ''} sin pagar. El más antiguo es ${oldest.period} (venció ${oldDue}).`,
          total: totalOverdue,
        });
        return;
      }

      // 5. Pendiente del mes actual
      if (hasPending) {
        if (today >= 28) {
          setAlert({ type: 'warning', message: `Período de pago abierto (${period}). Vence el ${dueLabel}.`, total: periodTotal });
        } else {
          setAlert({ type: 'info', message: `Tienes un pago pendiente del período ${period}. Vence el ${dueLabel}.`, total: periodTotal });
        }
        return;
      }

      // 6. En revisión
      if (allSubmitted) {
        setAlert({ type: 'info', message: `Tu comprobante del período ${period} está en revisión. Te notificaremos cuando sea aprobado.` });
      }
    }).catch(() => {});
  }, [role]);

  return alert;
}

function BillingBanner({ alert }: { alert: BillingAlert }) {
  const [dismissed, setDismissed] = useState(false);
  if (!alert || dismissed || alert.type === 'blocked') return null;

  const styles: Record<AlertType, string> = {
    info:    'bg-blue-600',
    warning: 'bg-amber-500',
    overdue: 'bg-red-600',
    blocked: 'bg-red-700',
  };

  return (
    <div className={`${styles[alert.type]} text-white px-4 py-2 flex items-center justify-between text-sm font-medium`}>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <CreditCard size={15} className="flex-shrink-0" />
        <span className="truncate">
          {alert.message}
          {alert.total && <span className="font-bold ml-1">Total: RD${Number(alert.total).toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>}
          {' — '}
          <Link href="/dashboard/billing" className="underline font-bold">Ver facturación</Link>
        </span>
      </div>
      {alert.type !== 'overdue' && (
        <button onClick={() => setDismissed(true)} className="ml-4 p-1 hover:bg-white/20 rounded flex-shrink-0">
          <X size={14} />
        </button>
      )}
    </div>
  );
}

export function MainLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const billingAlert = useBillingAlert(user?.role);

  useEffect(() => {
    const imp = localStorage.getItem('is_impersonating') === 'true';
    setIsImpersonating(imp);
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    // When impersonating, skip the role-based redirects for super_admin
    const imp = localStorage.getItem('is_impersonating') === 'true';
    if (imp) return;

    if (user.role === 'super_admin') {
      router.replace('/admin');
      return;
    }
    if (user.role === 'cashier') {
      router.replace('/pos');
      return;
    }
    if (user.role === 'employee') {
      router.replace('/employee');
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

  if (!user) return null;

  const imp = isImpersonating;
  if (!imp && (user.role === 'super_admin' || user.role === 'cashier' || user.role === 'employee')) return null;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {imp && <ImpersonationBanner />}
      <div className="flex flex-1">
        <Sidebar mobileOpen={mobileSidebarOpen} onClose={() => setMobileSidebarOpen(false)} />
        <div className="flex-1 lg:ml-64 flex flex-col">
          <BillingBanner alert={billingAlert} />
          {/* Mobile header */}
          <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-100 sticky top-0 z-20">
            <button onClick={() => setMobileSidebarOpen(true)} className="p-2 rounded-lg hover:bg-slate-100">
              <Menu size={20} className="text-slate-600" />
            </button>
            <span className="font-semibold text-slate-800 text-sm">FiscalRD</span>
          </div>
          <main className="flex-1 p-4 lg:p-8">{children}</main>
        </div>
      </div>
      <ChatBot />
    </div>
  );
}
