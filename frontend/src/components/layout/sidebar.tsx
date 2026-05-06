'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Users, Building2, UserCheck, Package,
  ShoppingCart, Truck, Users2, DollarSign, FileText, LogOut, Receipt, BookOpen,
  ShoppingBag, TrendingUp, TrendingDown, Landmark, Archive, ClipboardList,
  Monitor, User, Briefcase, LockOpen, CalendarDays, CreditCard, Bell, Percent,
  Settings, Activity, ChevronDown, GitBranch, ArrowRightLeft, CalendarCheck,
  Wrench, CalendarRange, UtensilsCrossed,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useBranch } from '@/contexts/branch-context';
import { useEffect, useState, useRef } from 'react';
import api from '@/lib/api';

// ─── Módulos disponibles ──────────────────────────────────────────────────────

const ALL_MODULES = {
  dashboard: { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  sales: { href: '/dashboard/sales', label: 'Ventas', icon: ShoppingCart },
  quotations: { href: '/dashboard/quotations', label: 'Cotizaciones', icon: ClipboardList },
  purchases: { href: '/dashboard/purchases', label: 'Compras', icon: ShoppingBag },
  customers: { href: '/dashboard/customers', label: 'Clientes', icon: UserCheck },
  products: { href: '/dashboard/products', label: 'Productos', icon: Package },
  inventory: { href: '/dashboard/inventory', label: 'Inventario', icon: Archive },
  inventoryTransfer: { href: '/dashboard/inventory/transfer', label: 'Transferir Stock', icon: ArrowRightLeft },
  suppliers: { href: '/dashboard/suppliers', label: 'Proveedores', icon: Truck },
  employees: { href: '/dashboard/employees', label: 'Empleados', icon: Users2 },
  payroll: { href: '/dashboard/payroll', label: 'Nómina', icon: DollarSign },
  yearEnd: { href: '/dashboard/year-closing', label: 'Cierre de Año', icon: CalendarCheck },
  accountsReceivable: { href: '/dashboard/accounts-receivable', label: 'Ctas. por Cobrar', icon: TrendingUp },
  accountsPayable: { href: '/dashboard/accounts-payable', label: 'Ctas. por Pagar', icon: TrendingDown },
  cashBank: { href: '/dashboard/cash-bank', label: 'Caja y Bancos', icon: Landmark },
  accounting: { href: '/dashboard/accounting', label: 'Contabilidad', icon: BookOpen },
  dgiiReports: { href: '/dashboard/dgii-reports', label: 'Reportes DGII', icon: FileText },
  ncfSequences: { href: '/dashboard/ncf-sequences', label: 'Secuencias e-CF', icon: Receipt },
  expenses: { href: '/dashboard/expenses', label: 'Gastos', icon: Receipt },
  withholdings: { href: '/dashboard/withholdings', label: 'Retenciones', icon: Percent },
  users: { href: '/dashboard/users', label: 'Usuarios', icon: Users },
  branches: { href: '/dashboard/branches', label: 'Sucursales', icon: GitBranch },
  tenants: { href: '/dashboard/tenants', label: 'Mi Empresa', icon: Building2 },
  onboarding: { href: '/dashboard/onboarding', label: 'Configuración', icon: Briefcase },
  cashRegister: { href: '/pos/caja', label: 'Control de Caja', icon: LockOpen },
  schedules: { href: '/dashboard/schedules', label: 'Horarios', icon: CalendarDays },
  serviceOrders: { href: '/dashboard/service-orders', label: 'Órdenes de Servicio', icon: Wrench },
  appointments: { href: '/dashboard/appointments', label: 'Agenda / Citas', icon: CalendarRange },
  tables: { href: '/dashboard/tables', label: 'Mesas', icon: UtensilsCrossed },
  billing: { href: '/dashboard/billing', label: 'Mi Facturación', icon: CreditCard },
  settings: { href: '/dashboard/settings', label: 'Ajustes', icon: Settings },
  activity: { href: '/dashboard/activity', label: 'Actividad', icon: Activity },
  employeePortal: { href: '/employee', label: 'Mi Portal', icon: ClipboardList },
  employeeProfile: { href: '/employee/profile', label: 'Mi Perfil', icon: User },
  employeePayroll: { href: '/employee/payroll', label: 'Mi Nómina', icon: DollarSign },
} as const;

type ModuleKey = keyof typeof ALL_MODULES;
type NavItem = typeof ALL_MODULES[ModuleKey];


// ─── Secciones del sidebar ────────────────────────────────────────────────────

interface NavSection {
  id: string;
  label: string;
  icon: React.ElementType;
  keys: ModuleKey[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    id: 'operaciones',
    label: 'Operaciones',
    icon: ShoppingCart,
    keys: ['cashRegister', 'sales', 'quotations', 'purchases', 'tables', 'serviceOrders', 'appointments'],
  },
  {
    id: 'inventario',
    label: 'Clientes & Productos',
    icon: Package,
    keys: ['customers', 'products', 'inventory', 'inventoryTransfer', 'suppliers'],
  },
  {
    id: 'rrhh',
    label: 'Recursos Humanos',
    icon: Users2,
    keys: ['employees', 'schedules', 'payroll', 'yearEnd'],
  },
  {
    id: 'finanzas',
    label: 'Finanzas',
    icon: Landmark,
    keys: ['accountsReceivable', 'accountsPayable', 'cashBank', 'expenses', 'withholdings', 'accounting'],
  },
  {
    id: 'dgii',
    label: 'Fiscal / DGII',
    icon: FileText,
    keys: ['dgiiReports', 'ncfSequences'],
  },
  {
    id: 'admin',
    label: 'Administración',
    icon: Settings,
    keys: ['users', 'branches', 'tenants', 'onboarding', 'activity', 'billing', 'settings'],
  },
];

// ─── Módulos por tipo de negocio ──────────────────────────────────────────────

// Base sin módulos especializados (retail genérico)
const BASE_MODULES: ModuleKey[] = [
  'dashboard', 'cashRegister', 'sales', 'quotations', 'purchases',
  'customers', 'products', 'inventory', 'suppliers', 'employees', 'schedules', 'payroll', 'yearEnd',
  'accountsReceivable', 'accountsPayable', 'cashBank', 'expenses', 'withholdings',
  'accounting', 'dgiiReports', 'ncfSequences', 'users',
];

// Con Mesas (restaurantes, bares)
const WITH_TABLES: ModuleKey[] = [...BASE_MODULES, 'tables'];
// Con Agenda/Citas (salones, barberías)
const WITH_APPOINTMENTS: ModuleKey[] = [...BASE_MODULES, 'appointments'];
// Con Órdenes de Servicio (talleres, reparadoras)
const WITH_SERVICE_ORDERS: ModuleKey[] = [...BASE_MODULES, 'serviceOrders'];
// Con Citas + Órdenes (consultorios)
const WITH_APPT_AND_SO: ModuleKey[] = [...BASE_MODULES, 'appointments', 'serviceOrders'];
// Todos los módulos (hoteles, servicios generales, otro)
const ALL_NAV_MODULES: ModuleKey[] = [...BASE_MODULES, 'tables', 'serviceOrders', 'appointments'];

const MODULES_BY_BUSINESS_TYPE: Record<string, ModuleKey[]> = {
  // Retail básico — sin módulos especializados
  colmado: BASE_MODULES,
  panaderia: BASE_MODULES,
  ferreteria: BASE_MODULES,
  farmacia: BASE_MODULES,
  ropa: BASE_MODULES,
  tecnologia: BASE_MODULES,
  agropecuario: BASE_MODULES,
  joyeria: BASE_MODULES,
  supermercado: BASE_MODULES,
  importadora: BASE_MODULES,
  constructora: BASE_MODULES,
  educacion: BASE_MODULES,
  transporte: BASE_MODULES,
  // Con Mesas
  restaurante: WITH_TABLES,
  bar: WITH_TABLES,
  // Con Agenda/Citas
  salon: WITH_APPOINTMENTS,
  // Con Órdenes de Servicio
  taller: WITH_SERVICE_ORDERS,
  // Con Citas + Órdenes de Servicio
  consultorio: WITH_APPT_AND_SO,
  // Con todo
  hotel: ALL_NAV_MODULES,
  servicios: ALL_NAV_MODULES,
  otro: ALL_NAV_MODULES,
};

function getNavModuleKeys(role: string, businessType?: string, branchId?: string | null, permissions?: string[] | null): ModuleKey[] {
  if (role === 'cashier') return [];
  if (role === 'employee') return [];

  const moduleKeys: ModuleKey[] = MODULES_BY_BUSINESS_TYPE[businessType ?? 'otro'] ?? ALL_NAV_MODULES;

  // Contador: solo fiscal/DGII + finanzas + nómina/cierre de año + ventas/compras/proveedores para cruzar datos DGII
  const ACCOUNTANT_EXCLUDED: ModuleKey[] = [
    // Operacional — no es su trabajo
    'cashRegister', 'quotations', 'customers', 'products', 'inventory', 'inventoryTransfer',
    // RR.HH. operacional — es del encargado
    'employees', 'schedules',
    // Administración del sistema
    'users', 'branches', 'tenants', 'onboarding', 'billing', 'activity',
    // Módulos especializados (mesas, citas, órdenes)
    'tables', 'serviceOrders', 'appointments',
  ];
  // Encargado de sucursal: operaciones + RR.HH. + finanzas operativas SOLO.
  // Fiscal/DGII es SIEMPRE consolidado — solo owner y contador tienen acceso.
  const MANAGER_EXCLUDED: ModuleKey[] = [
    'users', 'branches', 'tenants', 'onboarding', 'billing', 'activity',
    // Fiscal — consolidado por RNC, nunca por sucursal:
    'dgiiReports', 'ncfSequences', 'accounting', 'withholdings', 'yearEnd',
  ];

  let filtered: ModuleKey[];
  if (role === 'accountant') {
    filtered = moduleKeys.filter(k => !ACCOUNTANT_EXCLUDED.includes(k));
  } else if (role === 'manager') {
    filtered = moduleKeys.filter(k => !MANAGER_EXCLUDED.includes(k));
  } else {
    filtered = moduleKeys;
  }

  if (role === 'owner') {
    return [...filtered, 'inventoryTransfer', 'branches', 'tenants', 'onboarding', 'activity', 'billing', 'settings'];
  }
  if (role === 'admin') {
    // Admin de sucursal (branchId != null) → sin acceso a fiscal/DGII (es consolidado por RNC)
    // Admin global (branchId = null, negocio único) → acceso total igual que owner
    const isBranchAdmin = !!branchId;
    const FISCAL_MODULES: ModuleKey[] = ['dgiiReports', 'ncfSequences', 'accounting', 'withholdings', 'yearEnd'];
    const adminFiltered = isBranchAdmin
      ? filtered.filter(k => !FISCAL_MODULES.includes(k))
      : filtered;
    return [...adminFiltered, 'inventoryTransfer', 'branches', 'activity', 'billing', 'settings'];
  }
  if (role === 'manager') {
    const extra: ModuleKey[] = ['inventoryTransfer', 'settings'];
    if (permissions?.includes('manage_users')) extra.push('users');
    return [...filtered, ...extra];
  }
  return filtered;
}

// ─── Otros roles (cajero, empleado) ──────────────────────────────────────────

function getCashierItems(): NavItem[] {
  return [
    ALL_MODULES.cashRegister,
    ALL_MODULES.customers,
    ALL_MODULES.sales,
  ];
}

function getEmployeeItems(): NavItem[] {
  return [
    ALL_MODULES.employeePortal,
    ALL_MODULES.employeeProfile,
    ALL_MODULES.employeePayroll,
  ];
}

// ─── Emojis ───────────────────────────────────────────────────────────────────

const BUSINESS_EMOJI: Record<string, string> = {
  ferreteria: '🔧', colmado: '🛒', supermercado: '🏪', farmacia: '💊',
  restaurante: '🍽️', ropa: '👗', salon: '💇', taller: '🚗',
  tecnologia: '💻', servicios: '🏢', constructora: '🏗️', importadora: '📦',
  consultorio: '🏥', educacion: '🎓', hotel: '🏨', transporte: '🚛',
  agropecuario: '🌾', bar: '🍺', joyeria: '💍', panaderia: '🥖', otro: '🏬',
};

const PLAN_LABEL: Record<string, string> = {
  free: 'Gratis', basic: 'Básico', pro: 'Pro', enterprise: 'Empresarial',
};

// ─── Campanita de notificaciones ─────────────────────────────────────────────

function NotificationBell() {
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  const fetchCount = async () => {
    try {
      const r = await api.get('/notifications/count');
      setCount(r.data?.data ?? r.data ?? 0);
    } catch { /* ignore */ }
  };

  const fetchAll = async () => {
    try {
      const r = await api.get('/notifications?unread=true');
      setNotifications(r.data?.data ?? r.data ?? []);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => { if (open) fetchAll(); }, [open]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setCount(0); setNotifications([]); setOpen(false);
    } catch { /* ignore */ }
  };

  const TYPE_COLORS: Record<string, string> = {
    success: 'bg-green-500', error: 'bg-red-500', warning: 'bg-amber-500', info: 'bg-blue-500',
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="relative flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
      >
        <Bell size={16} />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute bottom-10 left-0 w-72 bg-white rounded-xl shadow-2xl border border-slate-100 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <span className="text-sm font-semibold text-slate-700">Notificaciones</span>
            {notifications.length > 0 && (
              <button onClick={markAllRead} className="text-xs text-blue-600 hover:underline">Marcar todas leídas</button>
            )}
          </div>
          <div className="max-h-72 overflow-y-auto">
            {notifications.length === 0
              ? <p className="text-sm text-slate-400 text-center py-6">Sin notificaciones</p>
              : notifications.map((n: any) => (
                <Link key={n.id} href={n.link ?? '/dashboard'} onClick={() => setOpen(false)}
                  className="flex gap-3 items-start px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0">
                  <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${TYPE_COLORS[n.type] ?? 'bg-slate-400'}`} />
                  <div>
                    <p className="text-xs font-semibold text-slate-700">{n.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-slate-300 mt-1">{new Intl.DateTimeFormat('es-DO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'America/Santo_Domingo' }).format(new Date(typeof n.createdAt === 'string' && !n.createdAt.endsWith('Z') && !n.createdAt.includes('+') ? n.createdAt + 'Z' : n.createdAt))}</p>
                  </div>
                </Link>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

interface SidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { branches, activeBranchId, setActiveBranchId, isMultiBranch } = useBranch();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [lowStockCount, setLowStockCount] = useState(0);

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);

  const emoji = BUSINESS_EMOJI[user?.businessType ?? ''] ?? '🏬';
  const role = user?.role ?? '';

  // ── Módulos disponibles para este usuario ─────────────────────────────────
  const rawKeys = getNavModuleKeys(role, user?.businessType, user?.branchId, user?.permissions);
  const availableKeys = new Set(
    isMultiBranch ? rawKeys : rawKeys.filter(k => k !== 'inventoryTransfer'),
  );

  // ── Estado de secciones colapsadas ────────────────────────────────────────
  // Inicializa: abre la sección que contiene la ruta activa, cierra las demás
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const section of NAV_SECTIONS) {
      const hasActive = section.keys.some(k => {
        if (!availableKeys.has(k)) return false;
        const { href } = ALL_MODULES[k];
        return href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);
      });
      init[section.id] = !hasActive;
    }
    return init;
  });

  const toggleSection = (id: string) =>
    setCollapsed(prev => ({ ...prev, [id]: !prev[id] }));

  // ── Low stock ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.tenantId) return;
    const fetch = () => {
      api.get('/inventory/low-stock').then(r => {
        const items = r.data?.data ?? r.data ?? [];
        setLowStockCount(Array.isArray(items) ? items.length : 0);
      }).catch(() => { });
    };
    fetch();
    const iv = setInterval(fetch, 60000);
    return () => clearInterval(iv);
  }, [user?.tenantId]);

  // ── Logo ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.tenantId) return;
    const fetch = () => {
      api.get('/tenants/me').then(r => {
        const t = r.data.data ?? r.data;
        setLogoUrl(t?.logoUrl ?? null);
      }).catch(() => { });
    };
    fetch();
    window.addEventListener('tenant-logo-updated', fetch);
    return () => window.removeEventListener('tenant-logo-updated', fetch);
  }, [user?.tenantId]);

  // ── Render de un ítem de navegación ──────────────────────────────────────
  const renderItem = (href: string, label: string, Icon: React.ElementType, key?: string) => {
    const active = isActive(href);
    const showBadge = href === '/dashboard/inventory' && lowStockCount > 0;
    return (
      <Link
        key={key ?? href}
        href={href}
        onClick={onClose}
        className={cn(
          'flex items-center gap-2.5 px-3 py-1.5 mx-2 rounded-lg text-sm transition-colors',
          active ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white',
        )}
      >
        <Icon size={15} className="flex-shrink-0" />
        <span className="flex-1 truncate">{label}</span>
        {showBadge && (
          <span className="w-4 h-4 bg-amber-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center flex-shrink-0">
            {lowStockCount > 9 ? '9+' : lowStockCount}
          </span>
        )}
      </Link>
    );
  };

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={onClose} />
      )}
      <aside className={cn(
        'w-64 bg-slate-900 text-white flex flex-col h-screen fixed left-0 top-0 z-40 transition-transform duration-200',
        'lg:translate-x-0',
        mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
      )}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="p-5 border-b border-slate-700/60 flex-shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-blue-400 font-bold text-lg">FiscalRD</span>
            <span className="text-xs bg-blue-600/30 text-blue-300 px-1.5 py-0.5 rounded font-mono">Ley 32-23</span>
          </div>
          {user?.businessName ? (
            <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-2 mt-2">
              {logoUrl
                ? <img src={logoUrl} alt="Logo" className="w-8 h-8 rounded object-contain bg-white p-0.5 flex-shrink-0" />
                : <span className="text-lg flex-shrink-0">{emoji}</span>}
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-200 truncate">{user.businessName}</p>
                <p className="text-xs text-slate-500 capitalize truncate">{user.businessType?.replace(/_/g, ' ') ?? 'Negocio'}</p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 mt-1">Sistema de Facturación Electrónica</p>
          )}

          {/* Indicador / selector de sucursal para owner */}
          {role === 'owner' && branches.length > 0 && (
            <div className="mt-2">
              {isMultiBranch ? (
                <select
                  value={activeBranchId ?? 'all'}
                  onChange={e => setActiveBranchId(e.target.value === 'all' ? null : e.target.value)}
                  className="w-full bg-slate-700/60 border border-slate-600/50 text-slate-200 text-xs rounded-lg px-2 py-1.5 cursor-pointer focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
                >
                  <option value="all">Todas las sucursales</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              ) : (
                <div className="flex items-center gap-1.5 bg-slate-700/40 border border-slate-600/30 rounded-lg px-2 py-1.5">
                  <GitBranch size={11} className="text-slate-500 flex-shrink-0" />
                  <span className="text-xs text-slate-400 truncate">{branches[0]?.name}</span>
                </div>
              )}
            </div>
          )}

          {/* Indicador de sucursal para admin/manager con sucursal asignada */}
          {role !== 'owner' && user?.branchId && (
            <div className="mt-2">
              <div className="flex items-center gap-1.5 bg-blue-600/20 border border-blue-500/30 rounded-lg px-2 py-1.5">
                <GitBranch size={11} className="text-blue-400 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-blue-400/70 font-medium uppercase tracking-wide leading-none mb-0.5">Tu sucursal</p>
                  <p className="text-xs text-blue-300 font-semibold truncate">
                    {branches.find(b => b.id === user.branchId)?.name ?? 'Sucursal asignada'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Navegación ─────────────────────────────────────────────────── */}
        <nav className="flex-1 overflow-y-auto py-2 scrollbar-thin">

          {/* Roles simples: cajero y empleado sin secciones */}
          {role === 'cashier' && getCashierItems().map(({ href, label, icon: Icon }) => renderItem(href, label, Icon))}
          {role === 'employee' && getEmployeeItems().map(({ href, label, icon: Icon }) => renderItem(href, label, Icon))}

          {/* Owner / Admin / Accountant: Dashboard fijo + secciones */}
          {!['cashier', 'employee'].includes(role) && (
            <>
              {/* Dashboard siempre visible arriba */}
              <div className="mb-1">
                {renderItem('/dashboard', 'Dashboard', LayoutDashboard)}
              </div>

              {/* Secciones colapsables */}
              {NAV_SECTIONS.map(section => {
                const sectionItems = section.keys
                  .filter(k => availableKeys.has(k))
                  .map(k => ALL_MODULES[k]);

                if (sectionItems.length === 0) return null;

                const isOpen = !collapsed[section.id];
                const SectionIcon = section.icon;

                return (
                  <div key={section.id} className="mb-0.5">
                    {/* Cabecera de sección */}
                    <button
                      onClick={() => toggleSection(section.id)}
                      className="flex items-center justify-between w-full px-4 py-1.5 text-left group"
                    >
                      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 group-hover:text-slate-300 transition-colors">
                        <SectionIcon size={11} />
                        {section.label}
                      </div>
                      <ChevronDown
                        size={11}
                        className={cn(
                          'text-slate-600 group-hover:text-slate-400 transition-all duration-200',
                          !isOpen && '-rotate-90',
                        )}
                      />
                    </button>

                    {/* Ítems de la sección */}
                    {isOpen && (
                      <div className="pb-1">
                        {sectionItems.map(({ href, label, icon: Icon }) =>
                          renderItem(href, label, Icon)
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </nav>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div className="p-3 border-t border-slate-700/60 flex-shrink-0 space-y-2">
          {/* Campanita */}
          <div className="flex items-center justify-between px-1">
            <NotificationBell />
            {user?.plan && user.plan !== 'free' && (
              <span className="text-xs bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded-full">
                Plan {PLAN_LABEL[user.plan] ?? user.plan}
              </span>
            )}
          </div>

          {/* Perfil */}
          <Link
            href="/dashboard/profile"
            className="flex items-center gap-2.5 hover:bg-slate-800 rounded-lg px-2 py-1.5 transition-colors group"
          >
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-slate-200 font-medium truncate group-hover:text-white">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
            </div>
            <User size={13} className="text-slate-600 group-hover:text-slate-400 flex-shrink-0" />
          </Link>

          {/* Cerrar sesión */}
          <button
            onClick={logout}
            className="flex items-center justify-center gap-2 w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/60 text-red-400 hover:text-red-300 rounded-lg px-3 py-2 text-xs font-semibold transition-all"
          >
            <LogOut size={13} />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
}
