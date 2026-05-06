'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import { ArrowLeft, Printer, Building2, RotateCcw, X, AlertTriangle, Mail, User } from 'lucide-react';
import { printThermalReceipt, type ThermalReceiptData } from '@/components/thermal-receipt';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SaleItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discountPct: number;
  discountAmount: number;
  itbisRate: number;
  itbisAmount: number;
  subtotal: number;
  total: number;
}

interface SaleDetail {
  id: string;
  saleNumber?: string;
  ncfNumber?: string;
  ncfType: string;
  saleDate: string;
  dueDate?: string;
  customerName?: string;
  customerRncCedula?: string;
  paymentMethod?: string;
  subtotal: number;
  itbisTotal: number;
  total: number;
  status: string;
  notes?: string;
  items: SaleItem[];
}

interface TenantInfo {
  businessName: string;
  rnc: string;
  address?: string;
  phone?: string;
  email?: string;
  logoUrl?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const NCF_LABELS: Record<string, string> = {
  E31: 'Crédito Fiscal',
  E32: 'Consumidor Final',
  E33: 'Nota de Débito',
  E34: 'Nota de Crédito',
  E41: 'Gastos Menores',
  E43: 'Gubernamental',
  E44: 'Régimen Especial',
  E45: 'Gubernamental',
};

const STATUS_CONFIG: Record<string, { label: string; badge: string; watermark?: boolean }> = {
  DRAFT:     { label: 'Borrador',  badge: 'bg-slate-100 text-slate-600' },
  ISSUED:    { label: 'Emitida',   badge: 'bg-green-100 text-green-700' },
  CANCELLED: { label: 'Anulada',  badge: 'bg-red-100 text-red-700', watermark: true },
};

const PAYMENT_LABELS: Record<string, string> = {
  cash:     'Efectivo',
  card:     'Tarjeta de Crédito/Débito',
  transfer: 'Transferencia Bancaria',
  credit:   'Crédito (Fiado)',
};

function fmtDate(d?: string) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return d; }
}

// ─── Return Modal ─────────────────────────────────────────────────────────────

function ReturnModal({
  sale,
  onClose,
  onReturned,
}: {
  sale: SaleDetail;
  onClose: () => void;
  onReturned: (creditNote: SaleDetail) => void;
}) {
  const [quantities, setQuantities] = useState<Record<string, number>>(
    Object.fromEntries(sale.items.map(i => [i.id, 0]))
  );
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const anySelected = Object.values(quantities).some(q => q > 0);

  const handleReturn = async () => {
    if (!anySelected) { toast.error('Selecciona al menos un artículo'); return; }
    setLoading(true);
    try {
      const items = sale.items
        .filter(i => (quantities[i.id] ?? 0) > 0)
        .map(i => ({
          productId: i.productId,
          productName: i.productName,
          quantity: quantities[i.id],
          unitPrice: Number(i.unitPrice),
          itbisRate: Number(i.itbisRate),
        }));
      const res = await api.post(`/sales/${sale.id}/return`, { items, notes });
      const creditNote = res.data.data ?? res.data;
      toast.success('Nota de crédito E34 emitida exitosamente');
      onReturned(creditNote);
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Error al procesar devolución');
    } finally {
      setLoading(false);
    }
  };

  const returnTotal = sale.items.reduce((acc, i) => {
    const qty = quantities[i.id] ?? 0;
    return acc + qty * Number(i.unitPrice) * (1 + Number(i.itbisRate) / 100);
  }, 0);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <RotateCcw size={18} className="text-red-500" />
              Devolución / Nota de Crédito E34
            </h2>
            {sale.ncfNumber && <p className="text-xs text-slate-500 font-mono mt-0.5">NCF original: {sale.ncfNumber}</p>}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>

        <div className="px-6 py-3 bg-amber-50 border-b border-amber-100">
          <p className="text-xs text-amber-700 flex items-start gap-1.5">
            <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
            Indica la cantidad a devolver de cada artículo. Se emitirá un comprobante E34 y se restaurará el inventario.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {sale.items.map(item => (
            <div key={item.id} className="flex items-center justify-between gap-4 border border-slate-100 rounded-xl p-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{item.productName}</p>
                <p className="text-xs text-slate-400">Cantidad vendida: {item.quantity} · {formatCurrency(Number(item.unitPrice))}</p>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-500">Devolver:</label>
                <input
                  type="number" min="0" max={Number(item.quantity)} step="1"
                  value={quantities[item.id] || ''}
                  onChange={e => setQuantities(prev => ({ ...prev, [item.id]: Math.min(Number(item.quantity), Math.max(0, parseInt(e.target.value) || 0)) }))}
                  className="w-16 text-center border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  placeholder="0"
                />
              </div>
            </div>
          ))}

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Motivo (opcional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Motivo de la devolución..."
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100">
          {anySelected && (
            <p className="text-sm text-slate-600 mb-3">
              Total a devolver: <span className="font-bold text-red-600">{formatCurrency(returnTotal)}</span>
            </p>
          )}
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors">
              Cancelar
            </button>
            <button
              onClick={handleReturn}
              disabled={!anySelected || loading}
              className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <RotateCcw size={15} />}
              {loading ? 'Procesando...' : 'Emitir Nota de Crédito'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SaleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [sale, setSale] = useState<SaleDetail | null>(null);
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get(`/sales/${id}`),
      api.get('/tenants/me').catch(() => ({ data: null })),
    ]).then(([saleRes, tenantRes]) => {
      setSale(saleRes.data.data ?? saleRes.data);
      const t = tenantRes.data?.data ?? tenantRes.data;
      if (t?.businessName) setTenant({ businessName: t.businessName, rnc: t.rnc, address: t.address, phone: t.phone, email: t.email, logoUrl: t.logoUrl });
    }).catch(() => {
      toast.error('Venta no encontrada');
      router.push('/dashboard/sales');
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
    </div>
  );
  if (!sale) return null;

  const st = STATUS_CONFIG[sale.status] ?? { label: sale.status, badge: 'bg-slate-100 text-slate-600' };
  const hasDiscount = sale.items.some(i => Number(i.discountPct) > 0);
  const isCredit = sale.paymentMethod === 'credit';

  const thermalData: ThermalReceiptData | null = tenant ? {
    businessName: tenant.businessName,
    rnc: tenant.rnc,
    address: tenant.address,
    phone: tenant.phone,
    logoUrl: tenant.logoUrl,
    ncfNumber: sale.ncfNumber,
    ncfType: sale.ncfType,
    saleDate: sale.saleDate,
    customerName: sale.customerName,
    customerRnc: sale.customerRncCedula,
    paymentMethod: sale.paymentMethod,
    dueDate: sale.dueDate,
    subtotal: Number(sale.subtotal),
    itbisTotal: Number(sale.itbisTotal),
    total: Number(sale.total),
    notes: sale.notes,
    items: sale.items.map(i => ({
      productName: i.productName,
      quantity: Number(i.quantity),
      unitPrice: Number(i.unitPrice),
      discountPct: Number(i.discountPct) || undefined,
      itbisRate: Number(i.itbisRate),
      total: Number(i.total),
    })),
  } : null;

  const handleSendEmail = async () => {
    if (!emailTo) return;
    setSendingEmail(true);
    try {
      await api.post(`/sales/${sale!.id}/send-email`, { customerEmail: emailTo });
      toast.success(`Factura enviada a ${emailTo}`);
      setShowEmailModal(false);
      setEmailTo('');
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Error al enviar email');
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <>
      {/* Email modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Mail size={18} className="text-blue-500" />
                Enviar Factura por Email
              </h2>
              <button onClick={() => setShowEmailModal(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <p className="text-sm text-slate-500 mb-4">
              Se enviará la factura {sale?.ncfNumber ?? ''} al correo indicado.
            </p>
            <input
              type="email"
              value={emailTo}
              onChange={e => setEmailTo(e.target.value)}
              placeholder="correo@ejemplo.com"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              onKeyDown={e => { if (e.key === 'Enter') handleSendEmail(); }}
            />
            <div className="flex gap-3">
              <button onClick={() => setShowEmailModal(false)}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">
                Cancelar
              </button>
              <button onClick={handleSendEmail} disabled={!emailTo || sendingEmail}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {sendingEmail ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Mail size={15} />}
                {sendingEmail ? 'Enviando...' : 'Enviar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showReturnModal && sale && (
        <ReturnModal
          sale={sale}
          onClose={() => setShowReturnModal(false)}
          onReturned={(creditNote) => {
            setShowReturnModal(false);
            toast.success(`Nota de crédito ${creditNote.ncfNumber ?? ''} emitida`);
          }}
        />
      )}
      {/* Print CSS — hides sidebar, nav, toolbar so only invoice prints */}
      <style>{`
        @media print {
          aside, nav, header, .no-print { display: none !important; }
          body { background: white !important; margin: 0; }
          main { margin-left: 0 !important; padding: 16px !important; }
          .invoice-card { box-shadow: none !important; border: none !important; }
        }
      `}</style>

      <div className="max-w-4xl mx-auto">

        {/* ── Toolbar (hidden on print) ─────────────────────────────── */}
        <div className="flex items-center justify-between mb-6 no-print">
          <Link href="/dashboard/sales" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
            <ArrowLeft size={16} /> Volver a Ventas
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={() => thermalData && printThermalReceipt(thermalData)}
              disabled={!thermalData}
              className="flex items-center gap-2 border border-slate-200 px-4 py-2 rounded-lg text-sm hover:bg-slate-50 transition-colors disabled:opacity-40"
            >
              <Printer size={15} /> Recibo 80mm
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg text-sm hover:bg-slate-700 transition-colors"
            >
              <Printer size={15} /> Imprimir / PDF
            </button>
            {sale.status === 'ISSUED' && (
              <button
                onClick={() => { setEmailTo(sale.customerName ? '' : ''); setShowEmailModal(true); }}
                className="flex items-center gap-2 border border-blue-200 text-blue-600 px-4 py-2 rounded-lg text-sm hover:bg-blue-50 transition-colors"
              >
                <Mail size={15} /> Enviar por email
              </button>
            )}
            {sale.status === 'ISSUED' && sale.ncfType !== 'E34' && (
              <button
                onClick={() => setShowReturnModal(true)}
                className="flex items-center gap-2 border border-red-200 text-red-600 px-4 py-2 rounded-lg text-sm hover:bg-red-50 transition-colors"
              >
                <RotateCcw size={15} /> Devolver
              </button>
            )}
          </div>
        </div>

        {/* ── Invoice Card ──────────────────────────────────────────── */}
        <div className="invoice-card bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

          {/* Cancelled watermark */}
          {st.watermark && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 opacity-10 rotate-[-30deg]">
              <span className="text-red-600 text-8xl font-black uppercase tracking-widest">ANULADA</span>
            </div>
          )}

          {/* ── Top color bar by NCF type ── */}
          <div className={`h-1.5 w-full ${sale.status === 'CANCELLED' ? 'bg-red-500' : 'bg-blue-600'}`} />

          {/* ── Header: Emisor + NCF ── */}
          <div className="px-8 pt-7 pb-6 border-b border-slate-100">
            <div className="flex justify-between items-start gap-6">

              {/* Emisor */}
              <div className="flex items-start gap-3">
                {tenant?.logoUrl ? (
                  <img src={tenant.logoUrl} alt="Logo" className="h-14 max-w-[140px] object-contain flex-shrink-0" />
                ) : (
                  <div className="p-2 bg-blue-50 rounded-lg flex-shrink-0">
                    <Building2 size={20} className="text-blue-600" />
                  </div>
                )}
                <div>
                  <h1 className="text-lg font-bold text-slate-800 leading-tight">
                    {tenant?.businessName ?? 'Mi Negocio'}
                  </h1>
                  {tenant?.rnc && (
                    <p className="text-sm text-slate-500">RNC: <span className="font-mono font-medium">{tenant.rnc}</span></p>
                  )}
                  {tenant?.address && <p className="text-xs text-slate-400 mt-0.5">{tenant.address}</p>}
                  {tenant?.phone && <p className="text-xs text-slate-400">{tenant.phone}</p>}
                  {tenant?.email && <p className="text-xs text-slate-400">{tenant.email}</p>}
                </div>
              </div>

              {/* NCF + Status */}
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-1">Comprobante Fiscal (e-CF)</p>
                <p className="font-mono text-2xl font-bold text-blue-700 leading-none">
                  {sale.ncfNumber ?? <span className="text-slate-300">Sin NCF</span>}
                </p>
                <p className="text-xs text-slate-500 mt-1">{NCF_LABELS[sale.ncfType] ?? sale.ncfType}</p>
                <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold ${st.badge}`}>
                  {st.label}
                </span>
                {sale.saleNumber && (
                  <p className="text-xs text-slate-400 mt-1">Venta #{sale.saleNumber}</p>
                )}
              </div>
            </div>
          </div>

          {/* ── Emisor / Receptor / Fecha grid ── */}
          <div className="px-8 py-5 grid grid-cols-3 gap-6 border-b border-slate-100 bg-slate-50/50">

            {/* Receptor */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <User size={13} className="text-slate-400" />
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Receptor / Cliente</p>
              </div>
              <p className="font-semibold text-slate-700">{sale.customerName ?? 'Consumidor Final'}</p>
              {sale.customerRncCedula && (
                <p className="text-sm text-slate-500 font-mono">RNC/Cédula: {sale.customerRncCedula}</p>
              )}
            </div>

            {/* Fechas */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Fechas</p>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Emisión:</span>
                  <span className="font-medium text-slate-700">{fmtDate(sale.saleDate)}</span>
                </div>
                {isCredit && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Vencimiento:</span>
                    <span className="font-medium text-amber-600">{fmtDate(sale.dueDate)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Pago */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Pago</p>
              <p className="text-sm font-medium text-slate-700">
                {PAYMENT_LABELS[sale.paymentMethod ?? 'cash'] ?? sale.paymentMethod}
              </p>
              {isCredit && (
                <span className="inline-block mt-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                  Crédito pendiente
                </span>
              )}
            </div>
          </div>

          {/* ── Items table ── */}
          <div className="px-8 py-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="text-left pb-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Descripción</th>
                  <th className="text-right pb-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Cant.</th>
                  <th className="text-right pb-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">P. Unit.</th>
                  {hasDiscount && (
                    <th className="text-right pb-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Desc.</th>
                  )}
                  <th className="text-right pb-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Subtotal</th>
                  <th className="text-right pb-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">ITBIS ({sale.items[0]?.itbisRate ?? 18}%)</th>
                  <th className="text-right pb-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Total</th>
                </tr>
              </thead>
              <tbody>
                {sale.items.map((item, idx) => (
                  <tr key={item.id ?? idx} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="py-3 text-slate-700 font-medium">{item.productName}</td>
                    <td className="py-3 text-right text-slate-500">{item.quantity}</td>
                    <td className="py-3 text-right text-slate-500">{formatCurrency(item.unitPrice)}</td>
                    {hasDiscount && (
                      <td className="py-3 text-right text-slate-500">
                        {Number(item.discountPct) > 0
                          ? <span className="text-red-500">-{item.discountPct}% ({formatCurrency(item.discountAmount)})</span>
                          : '—'
                        }
                      </td>
                    )}
                    <td className="py-3 text-right text-slate-500">{formatCurrency(item.subtotal)}</td>
                    <td className="py-3 text-right text-slate-500">{formatCurrency(item.itbisAmount)}</td>
                    <td className="py-3 text-right font-semibold text-slate-800">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Totals + Notes ── */}
          <div className="px-8 pb-8 flex gap-8 justify-between items-start">

            {/* Notes */}
            <div className="flex-1">
              {sale.notes && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Notas</p>
                  <p className="text-sm text-slate-600 max-w-xs">{sale.notes}</p>
                </div>
              )}
            </div>

            {/* Totals block */}
            <div className="w-72">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Subtotal gravado</span>
                  <span className="font-medium text-slate-700">{formatCurrency(sale.subtotal)}</span>
                </div>
                {hasDiscount && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Total descuentos</span>
                    <span className="font-medium text-red-500">
                      -{formatCurrency(sale.items.reduce((s, i) => s + Number(i.discountAmount), 0))}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">ITBIS (18%)</span>
                  <span className="font-medium text-slate-700">{formatCurrency(sale.itbisTotal)}</span>
                </div>
                <div className="flex justify-between items-center border-t-2 border-slate-200 pt-3 mt-1">
                  <span className="font-bold text-slate-800 text-base">TOTAL</span>
                  <span className="font-bold text-xl text-blue-700">{formatCurrency(sale.total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Fiscal Footer ── */}
          <div className="px-8 py-4 bg-slate-50 border-t border-slate-100">
            <div className="flex justify-between items-center text-xs text-slate-400">
              <p>Comprobante Fiscal Electrónico (e-CF) — Ley 32-23 — DGII República Dominicana</p>
              <p>Generado por FiscalRD</p>
            </div>
            {sale.ncfNumber && (
              <p className="text-xs text-slate-400 mt-1">
                NCF: <span className="font-mono font-medium text-slate-500">{sale.ncfNumber}</span>
                {' · '}Tipo: {NCF_LABELS[sale.ncfType] ?? sale.ncfType}
                {' · '}Emisión: {fmtDate(sale.saleDate)}
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
