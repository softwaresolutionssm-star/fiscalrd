'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import api from '@/lib/api';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import { fetchTenantInfo, buildPrintHeader } from '@/lib/print-utils';
import { Calculator, Gift, Printer, Users } from 'lucide-react';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  baseSalary?: number;
  hireDate?: string;
}

export default function YearEndPayrollPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);

  // Regalía Pascual
  const [rpEmployee, setRpEmployee] = useState('');
  const [rpYear, setRpYear] = useState(String(new Date().getFullYear()));
  const [rpResult, setRpResult] = useState<any>(null);
  const [rpLoading, setRpLoading] = useState(false);

  // Prestaciones
  const [prEmployee, setPrEmployee] = useState('');
  const [prYears, setPrYears] = useState('');
  const [prSalary, setPrSalary] = useState('');
  const [prResult, setPrResult] = useState<any>(null);
  const [prLoading, setPrLoading] = useState(false);

  useEffect(() => {
    api.get('/employees').then(r => setEmployees(r.data.data ?? [])).catch(() => {});
  }, []);

  const calcRegalia = async () => {
    if (!rpEmployee) { toast.error('Selecciona un empleado'); return; }
    setRpLoading(true);
    try {
      const r = await api.get(`/payroll/calculate/regalia-pascual?employeeId=${rpEmployee}&year=${rpYear}`);
      setRpResult(r.data.data ?? r.data);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Error al calcular');
    } finally { setRpLoading(false); }
  };

  const calcPrestaciones = async () => {
    if (!prEmployee) { toast.error('Selecciona un empleado'); return; }
    if (!prYears || !prSalary) { toast.error('Completa años de servicio y último salario'); return; }
    setPrLoading(true);
    try {
      const r = await api.get(
        `/payroll/calculate/prestaciones?employeeId=${prEmployee}&yearsOfService=${prYears}&lastSalary=${prSalary}`
      );
      setPrResult(r.data.data ?? r.data);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Error al calcular');
    } finally { setPrLoading(false); }
  };

  const onSelectEmployee = (id: string, setId: (v: string) => void, setSalary?: (v: string) => void, setYears?: (v: string) => void) => {
    setId(id);
    const emp = employees.find(e => e.id === id);
    if (!emp) return;
    if (setSalary && emp.baseSalary) setSalary(String(emp.baseSalary));
    if (setYears && emp.hireDate) {
      const hired = new Date(emp.hireDate);
      const years = (Date.now() - hired.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      setYears(years.toFixed(2));
    }
  };

  const printResult = async (title: string, content: string) => {
    const tenant = await fetchTenantInfo();
    const header = buildPrintHeader(tenant, title);
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>${title}</title>
<style>body{font-family:Arial,sans-serif;padding:40px;max-width:680px;margin:auto;}table{width:100%;border-collapse:collapse;margin:16px 0;}td{padding:10px 14px;border-bottom:1px solid #e2e8f0;}td:last-child{text-align:right;font-weight:600;}.total{background:#1e40af;color:white;font-weight:bold;}.footer{color:#94a3b8;font-size:11px;text-align:center;margin-top:32px;border-top:1px solid #e2e8f0;padding-top:12px;}</style>
</head><body>${header}${content}<div class="footer">FiscalRD — SM SOFTWARE SOLUTIONS · Cálculo informativo según Código Laboral RD</div></body></html>`);
    win.document.close();
    win.onload = () => win.print();
  };

  const printRegalia = () => {
    if (!rpResult) return;
    const emp = employees.find(e => e.id === rpEmployee);
    const name = emp ? `${emp.firstName} ${emp.lastName}` : '—';
    printResult('Regalía Pascual', `
      <h2>Regalía Pascual — ${rpYear}</h2>
      <p><strong>Empleado:</strong> ${name}</p>
      <table>
        <tr><td>Salario promedio (últimos 12 meses)</td><td>${formatCurrency(rpResult.averageSalary ?? 0)}</td></tr>
        <tr><td>Nóminas consideradas</td><td>${rpResult.payrollsConsidered ?? 0}</td></tr>
        <tr class="total"><td><strong>Regalía Pascual a pagar</strong></td><td><strong>${formatCurrency(rpResult.regaliaPascual ?? 0)}</strong></td></tr>
      </table>
      <p style="color:#64748b;font-size:13px;">${rpResult.note ?? ''}</p>
    `);
  };

  const printPrestaciones = () => {
    if (!prResult) return;
    const emp = employees.find(e => e.id === prEmployee);
    const name = emp ? `${emp.firstName} ${emp.lastName}` : '—';
    printResult('Prestaciones Laborales', `
      <h2>Prestaciones Laborales</h2>
      <p><strong>Empleado:</strong> ${name} &nbsp;|&nbsp; <strong>Años de servicio:</strong> ${prResult.yearsOfService}</p>
      <table>
        <tr><td>Último salario</td><td>${formatCurrency(prResult.lastSalary ?? 0)}</td></tr>
        <tr><td>Preaviso (${prResult.preaviso?.months} mes${prResult.preaviso?.months !== 1 ? 'es' : ''})</td><td>${formatCurrency(prResult.preaviso?.amount ?? 0)}</td></tr>
        <tr><td>Cesantía (${prResult.cesantia?.days} días)</td><td>${formatCurrency(prResult.cesantia?.amount ?? 0)}</td></tr>
        <tr><td>Vacaciones (${prResult.vacaciones?.days} días)</td><td>${formatCurrency(prResult.vacaciones?.amount ?? 0)}</td></tr>
        <tr><td>Regalía proporcional</td><td>${formatCurrency(prResult.regaliaProporcional ?? 0)}</td></tr>
        <tr class="total"><td><strong>TOTAL PRESTACIONES</strong></td><td><strong>${formatCurrency(prResult.total ?? 0)}</strong></td></tr>
      </table>
      <p style="color:#64748b;font-size:13px;">${prResult.note ?? ''}</p>
    `);
  };

  return (
    <div>
      <PageHeader
        title="Cierres de Año"
        description="Regalía Pascual y Prestaciones Laborales — Código Laboral RD"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Regalía Pascual ─────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-amber-50 rounded-lg"><Gift size={18} className="text-amber-600" /></div>
            <div>
              <h2 className="font-semibold text-slate-800">Regalía Pascual</h2>
              <p className="text-xs text-slate-400">Art. 219 — Equivale a 1 salario mensual promedio</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Empleado *</label>
              <select
                value={rpEmployee}
                onChange={e => onSelectEmployee(e.target.value, setRpEmployee)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              >
                <option value="">Seleccionar empleado...</option>
                {employees.map(e => (
                  <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Año</label>
              <input
                type="number"
                value={rpYear}
                onChange={e => setRpYear(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>
            <button
              onClick={calcRegalia}
              disabled={rpLoading}
              className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
            >
              <Calculator size={15} /> {rpLoading ? 'Calculando...' : 'Calcular Regalía Pascual'}
            </button>
          </div>

          {rpResult && (
            <div className="mt-5 bg-amber-50 rounded-xl p-4 border border-amber-100">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Nóminas consideradas</span>
                  <span className="font-medium">{rpResult.payrollsConsidered ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Salario promedio</span>
                  <span className="font-medium">{formatCurrency(rpResult.averageSalary ?? 0)}</span>
                </div>
                <div className="flex justify-between border-t border-amber-200 pt-2 mt-2">
                  <span className="font-bold text-slate-800">Regalía a pagar</span>
                  <span className="font-bold text-2xl text-amber-700">{formatCurrency(rpResult.regaliaPascual ?? 0)}</span>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-3">{rpResult.note}</p>
              <button
                onClick={printRegalia}
                className="mt-3 flex items-center gap-1.5 text-xs text-amber-700 hover:text-amber-900 border border-amber-300 px-3 py-1.5 rounded-lg"
              >
                <Printer size={13} /> Imprimir / PDF
              </button>
            </div>
          )}
        </div>

        {/* ── Prestaciones ─────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-blue-50 rounded-lg"><Users size={18} className="text-blue-600" /></div>
            <div>
              <h2 className="font-semibold text-slate-800">Prestaciones Laborales</h2>
              <p className="text-xs text-slate-400">Ley 16-92 — Preaviso, cesantía, vacaciones y regalía proporcional</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Empleado *</label>
              <select
                value={prEmployee}
                onChange={e => onSelectEmployee(e.target.value, setPrEmployee, setPrSalary, setPrYears)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">Seleccionar empleado...</option>
                {employees.map(e => (
                  <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Años de servicio *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={prYears}
                  onChange={e => setPrYears(e.target.value)}
                  placeholder="Ej: 3.5"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Último salario *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={prSalary}
                  onChange={e => setPrSalary(e.target.value)}
                  placeholder="RD$"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
            <button
              onClick={calcPrestaciones}
              disabled={prLoading}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
            >
              <Calculator size={15} /> {prLoading ? 'Calculando...' : 'Calcular Prestaciones'}
            </button>
          </div>

          {prResult && (
            <div className="mt-5 bg-blue-50 rounded-xl p-4 border border-blue-100">
              <div className="space-y-2 text-sm">
                {[
                  { label: `Preaviso (${prResult.preaviso?.months} mes${prResult.preaviso?.months !== 1 ? 'es' : ''})`, value: prResult.preaviso?.amount },
                  { label: `Cesantía (${prResult.cesantia?.days} días)`, value: prResult.cesantia?.amount },
                  { label: `Vacaciones (${prResult.vacaciones?.days} días)`, value: prResult.vacaciones?.amount },
                  { label: 'Regalía proporcional', value: prResult.regaliaProporcional },
                ].map(row => (
                  <div key={row.label} className="flex justify-between">
                    <span className="text-slate-500">{row.label}</span>
                    <span className="font-medium">{formatCurrency(row.value ?? 0)}</span>
                  </div>
                ))}
                <div className="flex justify-between border-t border-blue-200 pt-2 mt-2">
                  <span className="font-bold text-slate-800">Total prestaciones</span>
                  <span className="font-bold text-2xl text-blue-700">{formatCurrency(prResult.total ?? 0)}</span>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-3">{prResult.note}</p>
              <button
                onClick={printPrestaciones}
                className="mt-3 flex items-center gap-1.5 text-xs text-blue-700 hover:text-blue-900 border border-blue-300 px-3 py-1.5 rounded-lg"
              >
                <Printer size={13} /> Imprimir / PDF
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Info box */}
      <div className="mt-6 bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-500">
        <strong className="text-slate-700">Referencia legal:</strong> Regalía Pascual — Art. 219 Código Laboral (1 mes de salario promedio de últimos 12 meses, debe pagarse antes del 20 de diciembre). Prestaciones — Ley 16-92, Art. 80-93.
      </div>
    </div>
  );
}
