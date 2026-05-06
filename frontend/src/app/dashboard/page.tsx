'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { useBranch } from '@/contexts/branch-context';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import {
  ShoppingCart, Users, Package, DollarSign, FileText,
  TrendingUp, TrendingDown, Users2, XCircle, Plus, BarChart2,
  Banknote, ClipboardList, Truck, Archive, AlertTriangle,
  CreditCard, Star, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';

interface DashboardStats {
  period: string;
  sales: { total: number; itbis: number; subtotal: number; count: number };
  prevMonth: { total: number; count: number };
  growthPct: number;
  cancelled: number;
  customers: number;
  products: number;
  employees: number;
  arPending: { total: number; count: number };
  plan: { name: string; invoicesUsed: number; invoicesLimit: number | null; usagePct: number };
}

interface TopProduct { productName: string; qty: number; revenue: number; }

// ─── Business-type config ──────────────────────────────────────────────────────

const BUSINESS_CONFIG: Record<string, {
  emoji: string; color: string; bgColor: string; greeting: string;
  quickActions: { label: string; href: string; icon: any; color: string }[];
}> = {
  ferreteria: {
    emoji: '🔧', color: 'text-orange-600', bgColor: 'bg-orange-50',
    greeting: 'Gestiona tu ferretería',
    quickActions: [
      { label: 'Nueva Venta',      href: '/dashboard/sales/new',            icon: Plus,        color: 'bg-blue-50 text-blue-700 hover:bg-blue-100' },
      { label: 'Cotización',       href: '/dashboard/quotations',           icon: ClipboardList,color: 'bg-green-50 text-green-700 hover:bg-green-100' },
      { label: 'Inventario',       href: '/dashboard/inventory',            icon: Archive,     color: 'bg-orange-50 text-orange-700 hover:bg-orange-100' },
      { label: 'Proveedores',      href: '/dashboard/suppliers',            icon: Truck,       color: 'bg-purple-50 text-purple-700 hover:bg-purple-100' },
      { label: 'Cuentas x Cobrar', href: '/dashboard/accounts-receivable', icon: TrendingUp,  color: 'bg-teal-50 text-teal-700 hover:bg-teal-100' },
      { label: 'Reportes DGII',    href: '/dashboard/dgii-reports',        icon: FileText,    color: 'bg-red-50 text-red-700 hover:bg-red-100' },
    ],
  },
  colmado: {
    emoji: '🛒', color: 'text-green-600', bgColor: 'bg-green-50',
    greeting: 'Panel de tu colmado',
    quickActions: [
      { label: 'Ir al POS',     href: '/pos',                      icon: ShoppingCart, color: 'bg-green-50 text-green-700 hover:bg-green-100' },
      { label: 'Nueva Venta',   href: '/dashboard/sales/new',       icon: Plus,         color: 'bg-blue-50 text-blue-700 hover:bg-blue-100' },
      { label: 'Inventario',    href: '/dashboard/inventory',       icon: Archive,      color: 'bg-orange-50 text-orange-700 hover:bg-orange-100' },
      { label: 'Compras',       href: '/dashboard/purchases',       icon: Truck,        color: 'bg-purple-50 text-purple-700 hover:bg-purple-100' },
      { label: 'Caja y Bancos', href: '/dashboard/cash-bank',      icon: Banknote,     color: 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100' },
      { label: 'Reportes DGII', href: '/dashboard/dgii-reports',   icon: FileText,     color: 'bg-red-50 text-red-700 hover:bg-red-100' },
    ],
  },
  supermercado: {
    emoji: '🏪', color: 'text-blue-600', bgColor: 'bg-blue-50',
    greeting: 'Panel de tu supermercado',
    quickActions: [
      { label: 'Ir al POS',        href: '/pos',                            icon: ShoppingCart, color: 'bg-blue-50 text-blue-700 hover:bg-blue-100' },
      { label: 'Inventario',       href: '/dashboard/inventory',            icon: Archive,      color: 'bg-orange-50 text-orange-700 hover:bg-orange-100' },
      { label: 'Compras',          href: '/dashboard/purchases',            icon: Truck,        color: 'bg-purple-50 text-purple-700 hover:bg-purple-100' },
      { label: 'Cuentas x Cobrar', href: '/dashboard/accounts-receivable', icon: TrendingUp,   color: 'bg-teal-50 text-teal-700 hover:bg-teal-100' },
      { label: 'Empleados',        href: '/dashboard/employees',            icon: Users2,       color: 'bg-green-50 text-green-700 hover:bg-green-100' },
      { label: 'Reportes DGII',    href: '/dashboard/dgii-reports',        icon: FileText,     color: 'bg-red-50 text-red-700 hover:bg-red-100' },
    ],
  },
  restaurante: {
    emoji: '🍽️', color: 'text-red-600', bgColor: 'bg-red-50',
    greeting: 'Gestiona tu restaurante',
    quickActions: [
      { label: 'Ir al POS',     href: '/pos',                    icon: ShoppingCart, color: 'bg-green-50 text-green-700 hover:bg-green-100' },
      { label: 'Nueva Venta',   href: '/dashboard/sales/new',    icon: Plus,         color: 'bg-blue-50 text-blue-700 hover:bg-blue-100' },
      { label: 'Inventario',    href: '/dashboard/inventory',    icon: Archive,      color: 'bg-orange-50 text-orange-700 hover:bg-orange-100' },
      { label: 'Empleados',     href: '/dashboard/employees',    icon: Users2,       color: 'bg-purple-50 text-purple-700 hover:bg-purple-100' },
      { label: 'Nómina',        href: '/dashboard/payroll',      icon: DollarSign,   color: 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100' },
      { label: 'Reportes DGII', href: '/dashboard/dgii-reports', icon: FileText,     color: 'bg-red-50 text-red-700 hover:bg-red-100' },
    ],
  },
  farmacia: {
    emoji: '💊', color: 'text-teal-600', bgColor: 'bg-teal-50',
    greeting: 'Panel de tu farmacia',
    quickActions: [
      { label: 'Nueva Venta',      href: '/dashboard/sales/new',            icon: Plus,       color: 'bg-blue-50 text-blue-700 hover:bg-blue-100' },
      { label: 'Inventario',       href: '/dashboard/inventory',            icon: Archive,    color: 'bg-teal-50 text-teal-700 hover:bg-teal-100' },
      { label: 'Clientes',         href: '/dashboard/customers',            icon: Users,      color: 'bg-green-50 text-green-700 hover:bg-green-100' },
      { label: 'Compras',          href: '/dashboard/purchases',            icon: Truck,      color: 'bg-purple-50 text-purple-700 hover:bg-purple-100' },
      { label: 'Cuentas x Cobrar', href: '/dashboard/accounts-receivable', icon: TrendingUp, color: 'bg-orange-50 text-orange-700 hover:bg-orange-100' },
      { label: 'Reportes DGII',    href: '/dashboard/dgii-reports',        icon: FileText,   color: 'bg-red-50 text-red-700 hover:bg-red-100' },
    ],
  },
  salon: {
    emoji: '💇', color: 'text-pink-600', bgColor: 'bg-pink-50',
    greeting: 'Panel de tu salón',
    quickActions: [
      { label: 'Nueva Factura',    href: '/dashboard/sales/new',            icon: Plus,        color: 'bg-blue-50 text-blue-700 hover:bg-blue-100' },
      { label: 'Clientes',         href: '/dashboard/customers',            icon: Users,       color: 'bg-pink-50 text-pink-700 hover:bg-pink-100' },
      { label: 'Empleados',        href: '/dashboard/employees',            icon: Users2,      color: 'bg-purple-50 text-purple-700 hover:bg-purple-100' },
      { label: 'Nómina',           href: '/dashboard/payroll',              icon: DollarSign,  color: 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100' },
      { label: 'Cuentas x Cobrar', href: '/dashboard/accounts-receivable', icon: TrendingUp,  color: 'bg-teal-50 text-teal-700 hover:bg-teal-100' },
      { label: 'Reportes DGII',    href: '/dashboard/dgii-reports',        icon: FileText,    color: 'bg-red-50 text-red-700 hover:bg-red-100' },
    ],
  },
  taller: {
    emoji: '🚗', color: 'text-slate-600', bgColor: 'bg-slate-50',
    greeting: 'Panel de tu taller',
    quickActions: [
      { label: 'Nueva Factura',    href: '/dashboard/sales/new',            icon: Plus,        color: 'bg-blue-50 text-blue-700 hover:bg-blue-100' },
      { label: 'Cotización',       href: '/dashboard/quotations',           icon: ClipboardList,color: 'bg-green-50 text-green-700 hover:bg-green-100' },
      { label: 'Clientes',         href: '/dashboard/customers',            icon: Users,       color: 'bg-purple-50 text-purple-700 hover:bg-purple-100' },
      { label: 'Inventario',       href: '/dashboard/inventory',            icon: Archive,     color: 'bg-orange-50 text-orange-700 hover:bg-orange-100' },
      { label: 'Cuentas x Cobrar', href: '/dashboard/accounts-receivable', icon: TrendingUp,  color: 'bg-teal-50 text-teal-700 hover:bg-teal-100' },
      { label: 'Reportes DGII',    href: '/dashboard/dgii-reports',        icon: FileText,    color: 'bg-red-50 text-red-700 hover:bg-red-100' },
    ],
  },
  constructora: {
    emoji: '🏗️', color: 'text-amber-600', bgColor: 'bg-amber-50',
    greeting: 'Panel de tu constructora',
    quickActions: [
      { label: 'Nueva Factura',     href: '/dashboard/sales/new',            icon: Plus,         color: 'bg-blue-50 text-blue-700 hover:bg-blue-100' },
      { label: 'Cotización',        href: '/dashboard/quotations',           icon: ClipboardList, color: 'bg-green-50 text-green-700 hover:bg-green-100' },
      { label: 'Cuentas x Cobrar',  href: '/dashboard/accounts-receivable', icon: TrendingUp,   color: 'bg-teal-50 text-teal-700 hover:bg-teal-100' },
      { label: 'Cuentas x Pagar',   href: '/dashboard/accounts-payable',    icon: CreditCard,   color: 'bg-red-50 text-red-700 hover:bg-red-100' },
      { label: 'Empleados',         href: '/dashboard/employees',            icon: Users2,       color: 'bg-purple-50 text-purple-700 hover:bg-purple-100' },
      { label: 'Reportes DGII',     href: '/dashboard/dgii-reports',        icon: FileText,     color: 'bg-slate-50 text-slate-700 hover:bg-slate-100' },
    ],
  },
  importadora: {
    emoji: '📦', color: 'text-indigo-600', bgColor: 'bg-indigo-50',
    greeting: 'Panel de tu importadora',
    quickActions: [
      { label: 'Nueva Factura',    href: '/dashboard/sales/new',            icon: Plus,         color: 'bg-blue-50 text-blue-700 hover:bg-blue-100' },
      { label: 'Cotización',       href: '/dashboard/quotations',           icon: ClipboardList, color: 'bg-green-50 text-green-700 hover:bg-green-100' },
      { label: 'Proveedores',      href: '/dashboard/suppliers',            icon: Truck,        color: 'bg-purple-50 text-purple-700 hover:bg-purple-100' },
      { label: 'Inventario',       href: '/dashboard/inventory',            icon: Archive,      color: 'bg-orange-50 text-orange-700 hover:bg-orange-100' },
      { label: 'Cuentas x Pagar',  href: '/dashboard/accounts-payable',    icon: CreditCard,   color: 'bg-red-50 text-red-700 hover:bg-red-100' },
      { label: 'Reportes DGII',    href: '/dashboard/dgii-reports',        icon: FileText,     color: 'bg-slate-50 text-slate-700 hover:bg-slate-100' },
    ],
  },
  servicios: {
    emoji: '🏢', color: 'text-blue-600', bgColor: 'bg-blue-50',
    greeting: 'Panel de servicios',
    quickActions: [
      { label: 'Nueva Factura',    href: '/dashboard/sales/new',            icon: Plus,        color: 'bg-blue-50 text-blue-700 hover:bg-blue-100' },
      { label: 'Cotización',       href: '/dashboard/quotations',           icon: ClipboardList,color: 'bg-green-50 text-green-700 hover:bg-green-100' },
      { label: 'Clientes',         href: '/dashboard/customers',            icon: Users,       color: 'bg-purple-50 text-purple-700 hover:bg-purple-100' },
      { label: 'Cuentas x Cobrar', href: '/dashboard/accounts-receivable', icon: TrendingUp,  color: 'bg-teal-50 text-teal-700 hover:bg-teal-100' },
      { label: 'Empleados',        href: '/dashboard/employees',            icon: Users2,      color: 'bg-orange-50 text-orange-700 hover:bg-orange-100' },
      { label: 'Reportes DGII',    href: '/dashboard/dgii-reports',        icon: FileText,    color: 'bg-red-50 text-red-700 hover:bg-red-100' },
    ],
  },
  consultorio: {
    emoji: '🏥', color: 'text-cyan-600', bgColor: 'bg-cyan-50',
    greeting: 'Panel de tu consultorio',
    quickActions: [
      { label: 'Nueva Factura',    href: '/dashboard/sales/new',            icon: Plus,       color: 'bg-blue-50 text-blue-700 hover:bg-blue-100' },
      { label: 'Clientes',         href: '/dashboard/customers',            icon: Users,      color: 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100' },
      { label: 'Cuentas x Cobrar', href: '/dashboard/accounts-receivable', icon: TrendingUp, color: 'bg-teal-50 text-teal-700 hover:bg-teal-100' },
      { label: 'Empleados',        href: '/dashboard/employees',            icon: Users2,     color: 'bg-purple-50 text-purple-700 hover:bg-purple-100' },
      { label: 'Nómina',           href: '/dashboard/payroll',             icon: DollarSign, color: 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100' },
      { label: 'Reportes DGII',    href: '/dashboard/dgii-reports',        icon: FileText,   color: 'bg-red-50 text-red-700 hover:bg-red-100' },
    ],
  },
};

const DEFAULT_CONFIG = {
  emoji: '🏬', color: 'text-blue-600', bgColor: 'bg-blue-50',
  greeting: 'Panel de administración',
  quickActions: [
    { label: 'Nueva Venta',      href: '/dashboard/sales/new',            icon: Plus,        color: 'bg-blue-50 text-blue-700 hover:bg-blue-100' },
    { label: 'Cotización',       href: '/dashboard/quotations',           icon: ClipboardList,color: 'bg-green-50 text-green-700 hover:bg-green-100' },
    { label: 'Cuentas x Cobrar', href: '/dashboard/accounts-receivable', icon: TrendingUp,  color: 'bg-teal-50 text-teal-700 hover:bg-teal-100' },
    { label: 'Inventario',       href: '/dashboard/inventory',            icon: Archive,     color: 'bg-orange-50 text-orange-700 hover:bg-orange-100' },
    { label: 'Nómina',           href: '/dashboard/payroll',             icon: DollarSign,  color: 'bg-purple-50 text-purple-700 hover:bg-purple-100' },
    { label: 'Reportes DGII',    href: '/dashboard/dgii-reports',        icon: FileText,    color: 'bg-red-50 text-red-700 hover:bg-red-100' },
  ],
};

const PLAN_COLORS: Record<string, string> = {
  free: 'bg-slate-100 text-slate-600',
  basic: 'bg-blue-100 text-blue-700',
  pro: 'bg-purple-100 text-purple-700',
  enterprise: 'bg-amber-100 text-amber-700',
};
const PLAN_LABELS: Record<string, string> = {
  free: 'Gratis', basic: 'Básico', pro: 'Pro', enterprise: 'Empresarial',
};

export default function DashboardPage() {
  const { user } = useAuth();
  const { activeBranchId } = useBranch();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [dailyStats, setDailyStats] = useState<{ date: string; total: number }[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [lowStock, setLowStock] = useState<{ productId: string; productName: string; currentStock: number; minStock: number }[]>([]);
  const now = new Date();

  const todayStr = now.toISOString().split('T')[0];
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const [dateFrom, setDateFrom] = useState(firstOfMonth);
  const [dateTo, setDateTo] = useState(todayStr);

  // Solo el owner usa el selector de sucursal; otros roles el backend filtra por su JWT branchId
  const isOwner = user?.role === 'owner';
  const branchParam = isOwner && activeBranchId ? `&branchId=${activeBranchId}` : '';
  const branchQ    = isOwner && activeBranchId ? `?branchId=${activeBranchId}` : '';

  const loadStats = (from = dateFrom, to = dateTo) => {
    api.get(`/stats/dashboard?from=${from}&to=${to}${branchParam}`).then(r => setStats(r.data.data ?? r.data)).catch(() => null);
  };

  useEffect(() => {
    loadStats();
    api.get(`/stats/daily?days=7${branchParam}`).then(r => setDailyStats(r.data.data ?? [])).catch(() => null);
    api.get(`/stats/top-products${branchQ}`).then(r => setTopProducts(r.data.data ?? [])).catch(() => null);
    api.get(`/inventory/low-stock${branchQ}`).then(r => setLowStock(r.data.data ?? [])).catch(() => null);
  }, [activeBranchId]);

  const monthName = now.toLocaleString('es-DO', { month: 'long', year: 'numeric' });
  const config = BUSINESS_CONFIG[user?.businessType ?? ''] ?? DEFAULT_CONFIG;
  const hour = now.getHours();
  const timeGreeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';
  const isOwnerOrAdmin = user?.role === 'owner' || user?.role === 'admin';

  const plan = stats?.plan;
  const planWarning = plan?.invoicesLimit && plan.usagePct >= 80;

  return (
    <div>
      {/* ─── Hero banner ─────────────────────────────────────────── */}
      <div className={`${config.bgColor} border border-opacity-30 rounded-xl p-5 mb-6 flex items-center justify-between gap-4`}>
        <div className="flex items-center gap-4">
          <span className="text-4xl">{config.emoji}</span>
          <div>
            <h1 className="text-xl font-bold text-slate-800">
              {timeGreeting}, {user?.firstName}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {user?.businessName
                ? <><span className={`font-semibold ${config.color}`}>{user.businessName}</span> · {config.greeting}</>
                : config.greeting}
            </p>
          </div>
        </div>
        <div className="text-right hidden sm:flex flex-col items-end gap-1">
          <p className="text-xs text-slate-400 uppercase tracking-wide capitalize">{monthName}</p>
          {plan && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PLAN_COLORS[plan.name] ?? 'bg-slate-100 text-slate-600'}`}>
              Plan {PLAN_LABELS[plan.name] ?? plan.name}
            </span>
          )}
        </div>
      </div>

      {/* ─── Filtro de fechas ────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <span className="text-xs text-slate-500 font-medium">Período:</span>
        <input type="date" value={dateFrom} max={dateTo}
          onChange={e => setDateFrom(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
        <span className="text-xs text-slate-400">—</span>
        <input type="date" value={dateTo} min={dateFrom}
          onChange={e => setDateTo(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
        <button onClick={() => loadStats(dateFrom, dateTo)}
          className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-700 flex items-center gap-1.5">
          <BarChart2 size={13} /> Aplicar
        </button>
        <button onClick={() => { setDateFrom(firstOfMonth); setDateTo(todayStr); loadStats(firstOfMonth, todayStr); }}
          className="text-xs text-slate-400 hover:text-slate-600 underline">
          Este mes
        </button>
      </div>

      {/* ─── Alerta stock bajo ───────────────────────────────────── */}
      {lowStock.length > 0 && isOwnerOrAdmin && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-amber-800 text-sm">
              {lowStock.length} producto{lowStock.length !== 1 ? 's' : ''} con stock bajo o agotado
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {lowStock.slice(0, 5).map(p => (
                <span key={p.productId} className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                  {p.productName}: {p.currentStock} uds.
                </span>
              ))}
              {lowStock.length > 5 && <span className="text-xs text-amber-500">+{lowStock.length - 5} más</span>}
            </div>
          </div>
          <Link href="/dashboard/inventory" className="text-xs text-amber-700 font-medium hover:underline flex-shrink-0">Ver inventario →</Link>
        </div>
      )}

      {/* ─── Alerta límite de plan ───────────────────────────────── */}
      {planWarning && isOwnerOrAdmin && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle size={18} className="text-red-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-red-800 text-sm">
              Usaste {plan!.invoicesUsed} de {plan!.invoicesLimit} facturas este mes ({plan!.usagePct}%)
            </p>
            <p className="text-xs text-red-600 mt-0.5">Al llegar al límite no podrás emitir más facturas.</p>
          </div>
          <Link href="/dashboard/tenants" className="text-xs text-red-700 font-medium hover:underline flex-shrink-0">Actualizar plan →</Link>
        </div>
      )}

      {/* ─── Stats cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <StatBox
          label="Ventas del Mes"
          value={formatCurrency(stats?.sales.total ?? 0)}
          sub={`${stats?.sales.count ?? 0} facturas`}
          icon={DollarSign}
          color="text-blue-600 bg-blue-50"
          growth={stats?.growthPct}
        />
        <StatBox
          label="ITBIS Generado"
          value={formatCurrency(stats?.sales.itbis ?? 0)}
          sub="18% ITBIS"
          icon={TrendingUp}
          color="text-green-600 bg-green-50"
        />
        <StatBox
          label="Mes Anterior"
          value={formatCurrency(stats?.prevMonth.total ?? 0)}
          sub={`${stats?.prevMonth.count ?? 0} facturas`}
          icon={BarChart2}
          color="text-slate-600 bg-slate-50"
        />
        <StatBox
          label="Clientes"
          value={stats?.customers ?? 0}
          sub="registrados"
          icon={Users}
          color="text-purple-600 bg-purple-50"
        />
        <StatBox
          label="Productos"
          value={stats?.products ?? 0}
          sub="en catálogo"
          icon={Package}
          color="text-orange-600 bg-orange-50"
        />
        <StatBox
          label="Empleados"
          value={stats?.employees ?? 0}
          sub="activos"
          icon={Users2}
          color="text-teal-600 bg-teal-50"
        />
      </div>

      {/* ─── Indicador de uso del plan ───────────────────────────── */}
      {plan?.invoicesLimit && isOwnerOrAdmin && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">
              Facturas este mes: <strong>{plan.invoicesUsed}</strong> / {plan.invoicesLimit}
            </span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              plan.usagePct >= 90 ? 'bg-red-100 text-red-700' :
              plan.usagePct >= 70 ? 'bg-amber-100 text-amber-700' :
              'bg-green-100 text-green-700'
            }`}>{plan.usagePct}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                plan.usagePct >= 90 ? 'bg-red-500' :
                plan.usagePct >= 70 ? 'bg-amber-400' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(plan.usagePct, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* ─── Dos columnas: resumen + accesos rápidos ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Resumen financiero */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <BarChart2 size={15} className="text-slate-400" />
            Resumen Financiero — {monthName}
          </h2>
          <div className="space-y-3">
            <Row label="Subtotal ventas" value={formatCurrency(stats?.sales.subtotal ?? 0)} />
            <Row label="ITBIS (18%)" value={formatCurrency(stats?.sales.itbis ?? 0)} />
            <div className="border-t pt-3 flex justify-between text-sm">
              <span className="font-semibold text-slate-700">Total facturado</span>
              <span className="font-bold text-slate-900 text-base">{formatCurrency(stats?.sales.total ?? 0)}</span>
            </div>
            <Row label="Facturas emitidas" value={String(stats?.sales.count ?? 0)} />
            <Row label="e-CF anulados" value={String(stats?.cancelled ?? 0)} />
            {(stats?.growthPct ?? 0) !== 0 && (
              <div className="flex justify-between text-sm items-center">
                <span className="text-slate-500">vs. mes anterior</span>
                <span className={`flex items-center gap-1 font-semibold text-xs px-2 py-0.5 rounded-full ${
                  (stats?.growthPct ?? 0) >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}>
                  {(stats?.growthPct ?? 0) >= 0
                    ? <ArrowUpRight size={12} />
                    : <ArrowDownRight size={12} />}
                  {Math.abs(stats?.growthPct ?? 0)}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Accesos rápidos */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <ShoppingCart size={15} className="text-slate-400" />
            Accesos Rápidos
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {config.quickActions.map((item) => (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${item.color}`}>
                <item.icon size={14} />
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Segunda fila: AR pendiente + top productos ───────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Cuentas por cobrar pendientes */}
        {isOwnerOrAdmin && (stats?.arPending?.total ?? 0) > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <CreditCard size={15} className="text-slate-400" />
              Cuentas por Cobrar Pendientes
            </h2>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <p className="text-2xl font-bold text-slate-800">{formatCurrency(stats?.arPending?.total ?? 0)}</p>
                <p className="text-xs text-slate-500 mt-1">{stats?.arPending?.count ?? 0} facturas a crédito pendientes</p>
              </div>
              <Link href="/dashboard/accounts-receivable"
                className="flex items-center gap-1.5 text-sm text-blue-600 font-medium hover:underline">
                Ver todas <ArrowUpRight size={14} />
              </Link>
            </div>
            <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-amber-400 rounded-full" style={{ width: '100%' }} />
            </div>
          </div>
        )}

        {/* Top productos del mes */}
        {topProducts.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <Star size={15} className="text-slate-400" />
              Top Productos este Mes
            </h2>
            <div className="space-y-2.5">
              {topProducts.map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-400 w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{p.productName}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-slate-800">{formatCurrency(p.revenue)}</p>
                    <p className="text-xs text-slate-400">{p.qty} uds.</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ─── Gráfica de ventas ───────────────────────────────────── */}
      <RevenueChart data={dailyStats} />
    </div>
  );
}

function StatBox({ label, value, sub, icon: Icon, color, growth }: {
  label: string; value: string | number; sub: string; icon: any; color: string; growth?: number;
}) {
  const [bg, text] = color.split(' ');
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
      <div className="flex items-start justify-between mb-2">
        <div className={`${bg} p-2 rounded-lg`}>
          <Icon size={15} className={text} />
        </div>
        {growth !== undefined && growth !== 0 && (
          <span className={`text-xs font-semibold flex items-center gap-0.5 ${growth >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {growth >= 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
            {Math.abs(growth)}%
          </span>
        )}
      </div>
      <p className="text-xl font-bold text-slate-800">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
      <p className="text-xs text-slate-400">{sub}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-700">{value}</span>
    </div>
  );
}

function RevenueChart({ data }: { data: { date: string; total: number }[] }) {
  if (data.length === 0) return null;
  const max = Math.max(...data.map(d => d.total), 1);
  const total = data.reduce((s, d) => s + d.total, 0);
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <TrendingUp size={15} className="text-slate-400" />
          Ventas — Últimos 7 días
        </h2>
        <span className="text-sm font-bold text-slate-800">{formatCurrency(total)}</span>
      </div>
      <div className="flex items-end gap-2 h-32">
        {data.map((d, i) => {
          const pct = (d.total / max) * 100;
          const day = new Date(d.date + 'T00:00:00').toLocaleDateString('es-DO', { weekday: 'short', day: 'numeric' });
          const isToday = d.date === new Date().toISOString().split('T')[0];
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              {d.total > 0 && (
                <span className="text-xs text-slate-500 font-medium">
                  {formatCurrency(d.total).replace('RD$', '')}
                </span>
              )}
              <div className="w-full flex items-end justify-center" style={{ height: '80px' }}>
                <div
                  className={`w-full rounded-t-lg transition-colors ${isToday ? 'bg-blue-600' : 'bg-blue-400 hover:bg-blue-500'}`}
                  style={{ height: `${Math.max(pct, d.total > 0 ? 4 : 1)}%` }}
                  title={`${day}: ${formatCurrency(d.total)}`}
                />
              </div>
              <span className={`text-xs ${isToday ? 'font-semibold text-blue-600' : 'text-slate-400'}`}>{day}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
