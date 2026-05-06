'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import api from '@/lib/api';
import {
  CheckCircle2, Circle, ChevronRight, Package, Users,
  FileText, Building2, UserPlus, Landmark, Rocket,
} from 'lucide-react';

interface CheckItem {
  key: string;
  title: string;
  description: string;
  href: string;
  icon: any;
  done: boolean;
  loading: boolean;
}

export default function OnboardingPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<CheckItem[]>([
    {
      key: 'products',
      title: 'Agrega tu primer producto o servicio',
      description: 'Define los productos o servicios que vendes para poder facturar.',
      href: '/dashboard/products',
      icon: Package,
      done: false,
      loading: true,
    },
    {
      key: 'customers',
      title: 'Registra tu primer cliente',
      description: 'Crea el perfil de tus clientes para emitirles comprobantes fiscales.',
      href: '/dashboard/customers',
      icon: Users,
      done: false,
      loading: true,
    },
    {
      key: 'ncf',
      title: 'Configura las secuencias de e-CF',
      description: 'Verifica que las secuencias NCF estén activas para emitir comprobantes según la Ley 32-23.',
      href: '/dashboard/ncf-sequences',
      icon: FileText,
      done: false,
      loading: true,
    },
    {
      key: 'cashier',
      title: 'Crea un usuario cajero',
      description: 'Agrega al menos un cajero para operar el punto de venta (POS).',
      href: '/dashboard/users',
      icon: UserPlus,
      done: false,
      loading: true,
    },
    {
      key: 'caja',
      title: 'Abre tu primera caja',
      description: 'Abre el turno de caja declarando el fondo inicial antes de vender.',
      href: '/pos/caja',
      icon: Landmark,
      done: false,
      loading: true,
    },
  ]);

  useEffect(() => {
    async function check() {
      const [products, customers, ncf, users, caja] = await Promise.allSettled([
        api.get('/products'),
        api.get('/customers'),
        api.get('/ncf-sequences'),
        api.get('/users'),
        api.get('/cash-register/current'),
      ]);

      const getCount = (r: PromiseSettledResult<any>) =>
        r.status === 'fulfilled' ? (r.value.data.data ?? r.value.data ?? []).length : 0;

      const productsDone = getCount(products) > 0;
      const customersDone = getCount(customers) > 0;

      let ncfDone = false;
      if (ncf.status === 'fulfilled') {
        const seqs = ncf.value.data.data ?? ncf.value.data ?? [];
        ncfDone = seqs.some((s: any) => s.endSequence > 0);
      }

      let cashierDone = false;
      if (users.status === 'fulfilled') {
        const u = users.value.data.data ?? users.value.data ?? [];
        cashierDone = u.some((u: any) => u.role === 'cashier');
      }

      let cajaDone = false;
      if (caja.status === 'fulfilled') {
        const s = caja.value.data.data ?? caja.value.data;
        cajaDone = !!s;
      }

      setItems(prev =>
        prev.map(item => {
          const doneMap: Record<string, boolean> = {
            products: productsDone,
            customers: customersDone,
            ncf: ncfDone,
            cashier: cashierDone,
            caja: cajaDone,
          };
          return { ...item, done: doneMap[item.key] ?? false, loading: false };
        })
      );
    }

    check();
  }, []);

  const doneCount = items.filter(i => i.done).length;
  const progress = Math.round((doneCount / items.length) * 100);
  const allDone = doneCount === items.length;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <Rocket size={20} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Configuración inicial</h1>
            <p className="text-sm text-slate-500">
              {allDone
                ? '¡Todo listo! Tu negocio está configurado.'
                : `Completa estos pasos para comenzar a operar, ${user?.firstName}.`}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>{doneCount} de {items.length} completados</span>
            <span className="font-semibold text-blue-600">{progress}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {allDone && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 mb-6 flex items-start gap-3">
          <CheckCircle2 size={20} className="text-green-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-green-800">¡Tu negocio está completamente configurado!</p>
            <p className="text-sm text-green-700 mt-1">Ya puedes empezar a emitir comprobantes fiscales electrónicos.</p>
            <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-green-700 font-medium mt-2 hover:underline">
              Ir al dashboard <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      )}

      {/* Checklist */}
      <div className="space-y-3">
        {items.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={item.key}
              className={`bg-white rounded-xl border shadow-sm p-5 flex items-start gap-4 transition-all ${
                item.done
                  ? 'border-green-200 opacity-75'
                  : 'border-slate-100 hover:border-blue-200 hover:shadow-md'
              }`}
            >
              {/* Step number / check */}
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                item.done ? 'bg-green-100 text-green-600' : 'bg-blue-50 text-blue-600'
              }`}>
                {item.loading ? (
                  <div className="w-4 h-4 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin" />
                ) : item.done ? (
                  <CheckCircle2 size={18} />
                ) : (
                  idx + 1
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Icon size={15} className={item.done ? 'text-green-500' : 'text-slate-400'} />
                  <h3 className={`font-semibold text-sm ${item.done ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                    {item.title}
                  </h3>
                </div>
                <p className="text-xs text-slate-500">{item.description}</p>
              </div>

              {!item.done && !item.loading && (
                <Link
                  href={item.href}
                  className="flex-shrink-0 flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Ir <ChevronRight size={13} />
                </Link>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 text-center">
        <Link href="/dashboard" className="text-sm text-slate-400 hover:text-slate-600">
          Saltar por ahora → Ir al dashboard
        </Link>
      </div>
    </div>
  );
}
