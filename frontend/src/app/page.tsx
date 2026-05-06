'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  CheckCircle, FileText, ShoppingCart, Users, BarChart3, Package,
  CreditCard, Shield, Zap, Building2, Phone, MessageCircle,
  Receipt, BookOpen, TrendingUp, Clock, Globe,
} from 'lucide-react';

const WHATSAPP = '18096628402';
const WHATSAPP_URL = `https://wa.me/${WHATSAPP}?text=Hola%2C%20quiero%20informaci%C3%B3n%20sobre%20FiscalRD`;
const EMAIL = 'softwaresolutionssm@gmail.com';

const FEATURES = [
  {
    icon: Receipt,
    title: 'Facturación Electrónica e-CF',
    desc: 'Cumplimiento total con la Ley 32-23 de la DGII. Genera y transmite comprobantes fiscales electrónicos en tiempo real.',
    color: 'bg-blue-50 text-blue-600',
  },
  {
    icon: ShoppingCart,
    title: 'Punto de Venta (POS)',
    desc: 'POS táctil con escáner de código de barras, cobro de fiado, apertura/cierre de caja, múltiples métodos de pago.',
    color: 'bg-green-50 text-green-600',
  },
  {
    icon: Package,
    title: 'Inventario y Productos',
    desc: 'Control de stock en tiempo real, alertas de stock bajo, variantes de productos, gestión de proveedores.',
    color: 'bg-orange-50 text-orange-600',
  },
  {
    icon: Users,
    title: 'Nómina y Empleados',
    desc: 'Gestión completa de empleados, cálculo automático de nómina con TSS y retenciones, horarios y turnos.',
    color: 'bg-purple-50 text-purple-600',
  },
  {
    icon: TrendingUp,
    title: 'Cuentas por Cobrar y Pagar',
    desc: 'Control de fiados, créditos, seguimiento de pagos pendientes y vencidos, alertas automáticas.',
    color: 'bg-red-50 text-red-600',
  },
  {
    icon: BookOpen,
    title: 'Contabilidad',
    desc: 'Libro diario, balance general, estado de resultados. Todo integrado con ventas, compras y nómina.',
    color: 'bg-indigo-50 text-indigo-600',
  },
  {
    icon: FileText,
    title: 'Reportes DGII',
    desc: 'Genera automáticamente los reportes 606, 607, 608 y 609 listos para enviar a la DGII.',
    color: 'bg-amber-50 text-amber-600',
  },
  {
    icon: BarChart3,
    title: 'Dashboard y Estadísticas',
    desc: 'Panel de control con métricas en tiempo real, comparativo mensual, productos más vendidos e ingresos.',
    color: 'bg-teal-50 text-teal-600',
  },
  {
    icon: Building2,
    title: 'Multi-Negocio',
    desc: 'Un sistema para todos los tipos de negocio: ferretería, colmado, farmacia, restaurante, salón, taller y más.',
    color: 'bg-sky-50 text-sky-600',
  },
  {
    icon: Users,
    title: 'Múltiples Roles de Usuario',
    desc: 'Owner, administrador, cajero, contador y empleado. Cada uno con sus permisos y accesos específicos.',
    color: 'bg-pink-50 text-pink-600',
  },
  {
    icon: CreditCard,
    title: 'Cotizaciones y Compras',
    desc: 'Crea cotizaciones profesionales y conviértelas a facturas. Gestiona órdenes de compra y proveedores.',
    color: 'bg-emerald-50 text-emerald-600',
  },
  {
    icon: Shield,
    title: 'Seguro y en la Nube',
    desc: 'Datos respaldados en la nube, acceso desde cualquier dispositivo, actualizaciones automáticas incluidas.',
    color: 'bg-slate-50 text-slate-600',
  },
];

const DEFAULT_PRICES = { basic: 2500, pro: 4500, enterprise: 5500 };

const PLANS = [
  {
    name: 'Básico',
    priceKey: 'basic' as const,
    price: 2500,
    color: 'border-blue-200',
    badge: '',
    badgeColor: '',
    features: [
      '100 facturas / mes',
      'POS táctil',
      'Inventario y productos',
      'Clientes y proveedores',
      'Cuentas por cobrar',
      'Reportes DGII (606/607)',
      '2 usuarios',
      'Soporte por WhatsApp',
    ],
  },
  {
    name: 'Pro',
    priceKey: 'pro' as const,
    price: 4500,
    color: 'border-blue-600 ring-2 ring-blue-600',
    badge: 'Más popular',
    badgeColor: 'bg-blue-600 text-white',
    features: [
      '500 facturas / mes',
      'Todo lo del plan Básico',
      'Nómina y empleados',
      'Cotizaciones',
      'Cuentas por pagar',
      'Caja y bancos',
      'Contabilidad básica',
      '5 usuarios',
      'Soporte prioritario',
    ],
  },
  {
    name: 'Empresarial',
    priceKey: 'enterprise' as const,
    price: 5500,
    color: 'border-slate-800',
    badge: 'Completo',
    badgeColor: 'bg-slate-800 text-white',
    features: [
      'Facturas ilimitadas',
      'Todo lo del plan Pro',
      'Contabilidad completa',
      'Módulo de horarios',
      'Análisis avanzado',
      'Multi-sucursal (próximo)',
      'Usuarios ilimitados',
      'Soporte dedicado 24/7',
    ],
  },
];

const BUSINESS_TYPES = [
  '🔧 Ferretería', '🛒 Colmado', '🏪 Supermercado', '💊 Farmacia',
  '🍽️ Restaurante', '👗 Ropa y calzado', '💇 Salón de belleza', '🚗 Taller mecánico',
  '💻 Tecnología', '🏗️ Constructora', '📦 Importadora', '🏥 Consultorio médico',
  '🎓 Centro educativo', '🏨 Hotel', '🚛 Transporte', '🌾 Agropecuario',
  '🍺 Bar', '💍 Joyería', '🥖 Panadería', '🏢 Servicios profesionales',
];

export default function LandingPage() {
  const [prices, setPrices] = useState(DEFAULT_PRICES);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/admin/settings/public`)
      .then(r => r.json())
      .then(data => {
        const d = data?.data ?? data;
        if (d?.planPriceBasic) setPrices({
          basic:      d.planPriceBasic,
          pro:        d.planPricePro,
          enterprise: d.planPriceEnterprise,
        });
      })
      .catch(() => {}); // usa defaults si falla
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-800 font-sans">

      {/* ── NAVBAR ───────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-extrabold text-blue-600 tracking-tight">FiscalRD</span>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-mono font-semibold">Ley 32-23</span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-2 text-sm text-green-600 font-medium hover:text-green-700 transition-colors"
            >
              <MessageCircle size={16} />
              WhatsApp
            </a>
            <Link
              href="/login"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              Iniciar sesión
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white py-24 px-5">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-600/20 border border-blue-500/30 text-blue-300 text-xs px-4 py-1.5 rounded-full mb-6 font-medium">
            <Zap size={13} />
            Sistema oficial para cumplimiento con la DGII — Ley 32-23
          </div>
          <h1 className="text-5xl sm:text-6xl font-extrabold leading-tight mb-6 tracking-tight">
            Factura electrónica<br />
            <span className="text-blue-400">inteligente para RD</span>
          </h1>
          <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto leading-relaxed">
            El sistema de gestión empresarial más completo de República Dominicana.
            Cumple con la Ley 32-23, gestiona tu negocio y haz crecer tus ventas — todo en un solo lugar.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-green-500/30 hover:scale-105"
            >
              <MessageCircle size={22} />
              Hablar por WhatsApp
            </a>
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all"
            >
              Iniciar sesión
            </Link>
          </div>
          <p className="text-slate-500 text-sm mt-6">Contáctanos y te configuramos el sistema en menos de 24 horas</p>
        </div>
      </section>

      {/* ── TIPOS DE NEGOCIO ─────────────────────────────────────────────────── */}
      <section className="py-14 bg-slate-50 border-y border-slate-100 px-5">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-6">Funciona para todo tipo de negocio dominicano</p>
          <div className="flex flex-wrap justify-center gap-2.5">
            {BUSINESS_TYPES.map(b => (
              <span key={b} className="bg-white border border-slate-200 text-slate-600 text-sm px-4 py-2 rounded-full shadow-sm font-medium">
                {b}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────────────────── */}
      <section className="py-20 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-extrabold text-slate-900 mb-4">Todo lo que necesita tu negocio</h2>
            <p className="text-slate-500 text-lg max-w-xl mx-auto">
              Desde la primera venta hasta los reportes DGII — FiscalRD lo maneja todo.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(f => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${f.color}`}>
                    <Icon size={22} />
                  </div>
                  <h3 className="font-bold text-slate-900 mb-2">{f.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── STATS ────────────────────────────────────────────────────────────── */}
      <section className="bg-blue-600 text-white py-16 px-5">
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
          {[
            { value: '20+', label: 'Tipos de negocio' },
            { value: '100%', label: 'Cumplimiento DGII' },
            { value: '6', label: 'Roles de usuario' },
            { value: '24/7', label: 'Acceso en la nube' },
          ].map(s => (
            <div key={s.label}>
              <div className="text-4xl font-extrabold mb-1">{s.value}</div>
              <div className="text-blue-200 text-sm font-medium">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PRECIOS ──────────────────────────────────────────────────────────── */}
      <section className="py-20 px-5 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-extrabold text-slate-900 mb-4">Planes y precios</h2>
            <p className="text-slate-500 text-lg">Sin contratos. Cancela cuando quieras. Pago mensual.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
            {PLANS.map(plan => (
              <div
                key={plan.name}
                className={`bg-white rounded-2xl border-2 p-8 shadow-sm relative ${plan.color}`}
              >
                {plan.badge && (
                  <span className={`absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold px-4 py-1 rounded-full ${plan.badgeColor}`}>
                    {plan.badge}
                  </span>
                )}
                <h3 className="text-xl font-extrabold text-slate-900 mb-1">Plan {plan.name}</h3>
                <div className="flex items-end gap-1 mb-6 mt-3">
                  <span className="text-4xl font-extrabold text-slate-900">
                    RD${prices[plan.priceKey].toLocaleString()}
                  </span>
                  <span className="text-slate-400 text-sm mb-1">/mes</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-slate-600">
                      <CheckCircle size={16} className="text-green-500 flex-shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-bold text-sm transition-all"
                >
                  <MessageCircle size={15} />
                  Contratar por WhatsApp
                </a>
              </div>
            ))}
          </div>
          <p className="text-center text-slate-400 text-sm mt-8">
            ¿Tienes dudas sobre qué plan elegir? <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">Escríbenos por WhatsApp</a>
          </p>
        </div>
      </section>

      {/* ── CTA WHATSAPP ─────────────────────────────────────────────────────── */}
      <section className="py-20 px-5 bg-white">
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <MessageCircle size={32} className="text-green-600" />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 mb-4">¿Listo para empezar?</h2>
          <p className="text-slate-500 mb-8 text-lg">
            Contáctanos por WhatsApp y te configuramos el sistema para tu negocio en menos de 24 horas.
          </p>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 bg-green-500 hover:bg-green-600 text-white px-10 py-4 rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-green-500/30 hover:scale-105"
          >
            <MessageCircle size={22} />
            Escribir al WhatsApp
          </a>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-5 text-slate-400 text-sm">
            <div className="flex items-center gap-2">
              <Phone size={14} />
              <span>(809) 662-8402</span>
            </div>
            <span className="hidden sm:inline text-slate-300">·</span>
            <a href={`mailto:${EMAIL}`} className="flex items-center gap-2 hover:text-slate-700 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
              {EMAIL}
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────────── */}
      <footer className="bg-slate-900 text-slate-400 py-10 px-5">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="text-white font-extrabold text-xl">FiscalRD</span>
            <span className="text-slate-500 text-sm ml-3">by SM SOFTWARE SOLUTIONS</span>
          </div>
          <div className="text-sm text-center">
            Sistema de Facturación Electrónica — Ley 32-23 República Dominicana
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/login" className="hover:text-white transition-colors">Iniciar sesión</Link>
            <a href={`mailto:${EMAIL}`} className="hover:text-white transition-colors">{EMAIL}</a>
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="text-green-400 hover:text-green-300 transition-colors font-medium">WhatsApp</a>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-6 pt-6 border-t border-slate-800 text-center text-xs text-slate-600">
          © {new Date().getFullYear()} SM SOFTWARE SOLUTIONS · Todos los derechos reservados · Desarrollado por Saul Mercado
        </div>
      </footer>

      {/* ── WHATSAPP FLOTANTE ────────────────────────────────────────────────── */}
      <a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center shadow-xl hover:scale-110 transition-all"
        title="Hablar por WhatsApp"
      >
        <MessageCircle size={26} />
      </a>

    </div>
  );
}
