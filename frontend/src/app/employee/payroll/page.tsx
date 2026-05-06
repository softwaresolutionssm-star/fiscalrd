'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { fetchTenantInfo } from '@/lib/print-utils';
import { DollarSign, Printer } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

interface PayrollRecord {
  id: string;
  period: string;
  grossSalary: number;
  sfsEmployee: number;
  afpEmployee: number;
  isr: number;
  netSalary: number;
  status: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Borrador', color: 'bg-slate-100 text-slate-600' },
  APPROVED: { label: 'Aprobada', color: 'bg-blue-100 text-blue-700' },
  PAID: { label: 'Pagada', color: 'bg-green-100 text-green-700' },
};

export default function EmployeePayrollPage() {
  const { user } = useAuth();
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const printPayslip = async (r: PayrollRecord) => {
    const tenant = await fetchTenantInfo();
    const totalDeductions = r.sfsEmployee + r.afpEmployee + r.isr;
    const employeeName = user ? `${user.firstName} ${user.lastName}` : '—';
    const logoHtml = tenant?.logoUrl
      ? `<img src="${tenant.logoUrl}" alt="Logo" style="height:50px;max-width:150px;object-fit:contain;display:block;margin:0 auto 6px;" />`
      : '';
    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Recibo de Nómina — ${r.period}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #1e293b; padding: 40px; max-width: 600px; margin: auto; }
    .header { text-align: center; border-bottom: 3px solid #3b82f6; padding-bottom: 20px; margin-bottom: 24px; }
    .company { font-size: 20px; font-weight: 700; color: #3b82f6; }
    .doc-title { font-size: 14px; font-weight: 600; color: #64748b; margin-top: 4px; }
    .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .info-row { display: flex; flex-direction: column; }
    .info-label { font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
    .info-value { font-weight: 600; font-size: 13px; margin-top: 2px; }
    .section { margin-bottom: 16px; }
    .section-title { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; font-weight: 600; padding: 6px 0; border-bottom: 1px solid #e2e8f0; margin-bottom: 10px; }
    .line { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #f1f5f9; }
    .line.deduction .amount { color: #ef4444; }
    .total-box { background: #1e40af; color: white; border-radius: 8px; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; margin-top: 20px; }
    .total-label { font-size: 14px; font-weight: 600; }
    .total-amount { font-size: 22px; font-weight: 700; }
    .footer { text-align: center; color: #94a3b8; font-size: 10px; margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; }
    .paid-stamp { display: inline-block; border: 3px solid #16a34a; color: #16a34a; font-weight: 800; font-size: 16px; padding: 4px 14px; border-radius: 4px; transform: rotate(-15deg); position: absolute; top: 60px; right: 60px; opacity: 0.7; }
    @media print { body { padding: 20px; } .paid-stamp { display: block; } }
  </style>
</head>
<body>
  <div style="position:relative">
    ${r.status === 'PAID' ? '<div class="paid-stamp">PAGADO</div>' : ''}
    <div class="header">
      ${logoHtml}
      <div class="company">${tenant?.businessName ?? 'Mi Negocio'}</div>
      <div class="doc-title">RECIBO DE NÓMINA</div>
    </div>

    <div class="info-box">
      <div class="info-row">
        <span class="info-label">Empleado</span>
        <span class="info-value">${employeeName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Período</span>
        <span class="info-value">${r.period}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Estado</span>
        <span class="info-value">${STATUS_LABELS[r.status]?.label ?? r.status}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Empresa</span>
        <span class="info-value">${user?.businessName ?? '—'}</span>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Ingresos</div>
      <div class="line">
        <span>Salario Bruto</span>
        <span class="amount">RD$ ${r.grossSalary.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Deducciones</div>
      <div class="line deduction">
        <span>SFS (Seguro Familiar de Salud)</span>
        <span class="amount">-RD$ ${r.sfsEmployee.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
      </div>
      <div class="line deduction">
        <span>AFP (Pensión)</span>
        <span class="amount">-RD$ ${r.afpEmployee.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
      </div>
      <div class="line deduction">
        <span>ISR (Impuesto sobre la Renta)</span>
        <span class="amount">-RD$ ${r.isr.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
      </div>
      <div class="line" style="font-weight:600;color:#64748b;">
        <span>Total deducciones</span>
        <span>-RD$ ${totalDeductions.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
      </div>
    </div>

    <div class="total-box">
      <span class="total-label">SALARIO NETO A RECIBIR</span>
      <span class="total-amount">RD$ ${r.netSalary.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
    </div>

    <div class="footer">
      Generado por FiscalRD — SM SOFTWARE SOLUTIONS<br/>
      Este documento es informativo. Para consultas contacte a su administrador.
    </div>
  </div>
</body>
</html>`;

    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.onload = () => { win.print(); };
  };

  useEffect(() => {
    api
      .get('/payroll/my')
      .then(r => setRecords(r.data?.data ?? r.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Mi Nómina</h1>
        <p className="text-slate-500 text-sm mt-1">Historial de pagos de nómina</p>
      </div>

      {records.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center py-20 px-6 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
            <DollarSign size={32} className="text-slate-400" />
          </div>
          <h2 className="text-lg font-semibold text-slate-700 mb-2">Sin registros</h2>
          <p className="text-slate-400 text-sm max-w-xs">
            Aún no tienes registros de nómina disponibles. Consulta con tu administrador.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Período</th>
                <th className="text-right px-4 py-3 text-slate-500 font-medium">Salario Bruto</th>
                <th className="text-right px-4 py-3 text-slate-500 font-medium">SFS</th>
                <th className="text-right px-4 py-3 text-slate-500 font-medium">AFP</th>
                <th className="text-right px-4 py-3 text-slate-500 font-medium">ISR</th>
                <th className="text-right px-4 py-3 text-slate-500 font-medium">Salario Neto</th>
                <th className="text-center px-4 py-3 text-slate-500 font-medium">Estado</th>
              <th className="text-center px-4 py-3 text-slate-500 font-medium">Recibo</th>
              </tr>
            </thead>
            <tbody>
              {records.map(r => {
                const st = STATUS_LABELS[r.status] ?? { label: r.status, color: 'bg-slate-100 text-slate-600' };
                const totalDeductions = r.sfsEmployee + r.afpEmployee + r.isr;
                return (
                  <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-700">{r.period}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{formatCurrency(r.grossSalary)}</td>
                    <td className="px-4 py-3 text-right text-red-500">-{formatCurrency(r.sfsEmployee)}</td>
                    <td className="px-4 py-3 text-right text-red-500">-{formatCurrency(r.afpEmployee)}</td>
                    <td className="px-4 py-3 text-right text-red-500">-{formatCurrency(r.isr)}</td>
                    <td className="px-4 py-3 text-right font-bold text-green-700 text-base">
                      {formatCurrency(r.netSalary)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>
                        {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => printPayslip(r)}
                        title="Imprimir recibo de nómina"
                        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-blue-600 border border-slate-200 hover:border-blue-300 px-2 py-1 rounded"
                      >
                        <Printer size={12} /> Imprimir
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
