'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import {
  User, DollarSign, Calendar, Clock, CheckCircle2,
  TrendingUp, FileText, Phone, Mail, Briefcase,
} from 'lucide-react';

interface PayrollRecord {
  id: string;
  period: string;
  grossSalary: number;
  netSalary: number;
  sfsEmployee: number;
  afpEmployee: number;
  isr: number;
  status: string;
}

interface EmployeeRecord {
  id: string;
  firstName: string;
  lastName: string;
  position?: string;
  department?: string;
  email?: string;
  phone?: string;
  baseSalary?: number;
  hireDate?: string;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 18) return 'Buenas tardes';
  return 'Buenas noches';
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-600', APPROVED: 'bg-blue-100 text-blue-700', PAID: 'bg-green-100 text-green-700',
};
const STATUS_LABELS: Record<string, string> = { DRAFT: 'Borrador', APPROVED: 'Aprobada', PAID: 'Pagada' };

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const [payrolls, setPayrolls] = useState<PayrollRecord[]>([]);
  const [employeeRecord, setEmployeeRecord] = useState<EmployeeRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/payroll/my').catch(() => ({ data: [] })),
      api.get('/employees/me').catch(() => ({ data: null })),
    ]).then(([payRes, empRes]) => {
      const allPayrolls: PayrollRecord[] = payRes.data?.data ?? payRes.data ?? [];
      setPayrolls(allPayrolls.slice(0, 6));
      const emp = empRes.data?.data ?? empRes.data;
      if (emp) setEmployeeRecord(emp);
    }).finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const latestPaid = payrolls.find(p => p.status === 'PAID');
  const pendingCount = payrolls.filter(p => p.status !== 'PAID').length;

  return (
    <div>
      {/* Hero */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 mb-6 text-white">
        <p className="text-blue-200 text-sm mb-1">{greeting()},</p>
        <h1 className="text-2xl font-bold mb-1">{user?.firstName} {user?.lastName}</h1>
        <p className="text-blue-200 text-sm">
          {employeeRecord?.position ?? 'Empleado'} · {employeeRecord?.department ?? user?.businessName ?? 'FiscalRD'}
        </p>
        <p className="text-blue-300 text-xs mt-2">
          {new Date().toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { icon: DollarSign, color: 'bg-green-50 text-green-600', label: 'Último salario neto', value: latestPaid ? formatCurrency(latestPaid.netSalary) : '—' },
          { icon: FileText,   color: 'bg-blue-50 text-blue-600',   label: 'Nóminas registradas', value: payrolls.length },
          { icon: CheckCircle2,color:'bg-teal-50 text-teal-600',   label: 'Nóminas pagadas',     value: payrolls.filter(p => p.status === 'PAID').length },
          { icon: Clock,      color: 'bg-amber-50 text-amber-600', label: 'Pendientes de pago',  value: pendingCount },
        ].map(({ icon: Icon, color, label, value }) => {
          const [bg, text] = color.split(' ');
          return (
            <div key={label} className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
              <div className={`${bg} p-2 rounded-lg w-fit mb-2`}><Icon size={16} className={text} /></div>
              <p className="text-lg font-bold text-slate-800">{typeof value === 'number' ? value.toLocaleString('es-DO') : value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payroll history */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <TrendingUp size={16} className="text-slate-400" /> Historial de Nómina
            </h3>
            <Link href="/employee/payroll" className="text-xs text-blue-600 hover:text-blue-700">Ver todo →</Link>
          </div>
          {payrolls.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">No hay registros de nómina disponibles aún</div>
          ) : (
            <div className="space-y-1">
              {payrolls.map(p => (
                <div key={p.id} className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                      <Calendar size={14} className="text-blue-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700">{p.period}</p>
                      <p className="text-xs text-slate-400">Bruto: {formatCurrency(p.grossSalary)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-800">{formatCurrency(p.netSalary)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[p.status] ?? 'bg-slate-100 text-slate-500'}`}>
                      {STATUS_LABELS[p.status] ?? p.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Employee info card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <User size={16} className="text-slate-400" /> Mi Información
          </h3>
          <div className="space-y-3">
            {employeeRecord?.position && (
              <div className="flex items-start gap-2.5">
                <Briefcase size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
                <div><p className="text-xs text-slate-400">Puesto</p><p className="text-sm font-medium text-slate-700">{employeeRecord.position}</p></div>
              </div>
            )}
            {employeeRecord?.department && (
              <div className="flex items-start gap-2.5">
                <Briefcase size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
                <div><p className="text-xs text-slate-400">Departamento</p><p className="text-sm font-medium text-slate-700">{employeeRecord.department}</p></div>
              </div>
            )}
            {employeeRecord?.phone && (
              <div className="flex items-start gap-2.5">
                <Phone size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
                <div><p className="text-xs text-slate-400">Teléfono</p><p className="text-sm font-medium text-slate-700">{employeeRecord.phone}</p></div>
              </div>
            )}
            {user?.email && (
              <div className="flex items-start gap-2.5">
                <Mail size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
                <div><p className="text-xs text-slate-400">Email</p><p className="text-sm font-medium text-slate-700 break-all">{user.email}</p></div>
              </div>
            )}
            {employeeRecord?.hireDate && (
              <div className="flex items-start gap-2.5">
                <Calendar size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
                <div><p className="text-xs text-slate-400">Fecha ingreso</p><p className="text-sm font-medium text-slate-700">{new Date(employeeRecord.hireDate).toLocaleDateString('es-DO')}</p></div>
              </div>
            )}
            {employeeRecord?.baseSalary && (
              <div className="flex items-start gap-2.5">
                <DollarSign size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
                <div><p className="text-xs text-slate-400">Salario base</p><p className="text-sm font-medium text-slate-700">{formatCurrency(employeeRecord.baseSalary)}</p></div>
              </div>
            )}
          </div>
          <div className="mt-5 pt-4 border-t border-slate-100 space-y-1">
            <Link href="/employee/payroll" className="flex items-center justify-between text-sm text-slate-600 hover:text-blue-600 py-1.5 px-2 rounded-lg hover:bg-blue-50 transition-colors">
              <span className="flex items-center gap-2"><DollarSign size={14} />Mi Nómina</span><span>→</span>
            </Link>
            <Link href="/employee/profile" className="flex items-center justify-between text-sm text-slate-600 hover:text-blue-600 py-1.5 px-2 rounded-lg hover:bg-blue-50 transition-colors">
              <span className="flex items-center gap-2"><User size={14} />Mi Perfil</span><span>→</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Latest payslip */}
      {latestPaid && (
        <div className="mt-6 bg-white rounded-xl shadow-sm border border-slate-100 p-5">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <FileText size={16} className="text-slate-400" /> Último Recibo — {latestPaid.period}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {[
              { label: 'Salario Bruto', value: formatCurrency(latestPaid.grossSalary), color: 'text-slate-800' },
              { label: 'SFS (3.04%)',   value: `-${formatCurrency(latestPaid.sfsEmployee)}`, color: 'text-red-500' },
              { label: 'AFP (2.87%)',   value: `-${formatCurrency(latestPaid.afpEmployee)}`, color: 'text-red-500' },
              { label: 'ISR',           value: `-${formatCurrency(latestPaid.isr)}`,         color: 'text-red-500' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-400 mb-1">{label}</p>
                <p className={`text-base font-bold ${color}`}>{value}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <span className="font-semibold text-slate-700">Salario Neto</span>
            <span className="text-2xl font-bold text-green-600">{formatCurrency(latestPaid.netSalary)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
