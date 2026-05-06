'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Plus, Eye, Send, CheckCircle, XCircle, ShoppingCart, Printer } from 'lucide-react';
import { BranchBadge } from '@/components/ui/branch-badge';
import { useRouter } from 'next/navigation';
import { formatCurrency, formatDate } from '@/lib/utils';
import { fetchTenantInfo, buildPrintHeader } from '@/lib/print-utils';

interface QuotationLine {
  productId?: string;
  description: string;
  quantity: number | string;
  unitPrice: number | string;
  itbisRate?: number;
}

interface Product {
  id: string;
  name: string;
  price: number;
  itbisRate: number;
}

interface Customer {
  id: string;
  name: string;
  rncCedula: string;
}

interface StockLevel {
  productId: string;
  currentStock: number;
}

interface Quotation {
  id: string;
  quotationNumber?: string;
  customerName?: string;
  date?: string;
  quoteDate?: string;
  validUntil?: string;
  total: number;
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  notes?: string;
  lines?: QuotationLine[];
  items?: QuotationLine[];
}

const statusConfig: Record<string, { label: string; color: string }> = {
  DRAFT:    { label: 'Borrador',  color: 'bg-slate-100 text-slate-600' },
  SENT:     { label: 'Enviada',   color: 'bg-blue-100 text-blue-700' },
  ACCEPTED: { label: 'Aceptada',  color: 'bg-green-100 text-green-700' },
  REJECTED: { label: 'Rechazada', color: 'bg-red-100 text-red-700' },
  EXPIRED:  { label: 'Vencida',   color: 'bg-orange-100 text-orange-700' },
};

const emptyLine: QuotationLine = { productId: '', description: '', quantity: '1', unitPrice: '', itbisRate: 18 };

const emptyForm = {
  customerId: '',
  customerName: '',
  customerRncCedula: '',
  date: new Date().toISOString().slice(0, 10),
  validUntil: '',
  notes: '',
  lines: [{ ...emptyLine }],
};

export default function QuotationsPage() {
  const router = useRouter();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [detail, setDetail] = useState<Quotation | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [converting, setConverting] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stockLevels, setStockLevels] = useState<StockLevel[]>([]);

  const load = () =>
    api.get('/quotations').then(r => setQuotations(r.data.data ?? [])).catch(() => null);

  useEffect(() => {
    load();
    api.get('/products').then(r => setProducts(r.data.data ?? [])).catch(() => {});
    api.get('/customers').then(r => setCustomers(r.data.data ?? [])).catch(() => {});
    api.get('/inventory/stock').then(r => setStockLevels(r.data.data ?? r.data ?? [])).catch(() => {});
  }, []);

  const getStock = (productId: string) => {
    const level = stockLevels.find(s => s.productId === productId);
    return level?.currentStock ?? null;
  };

  const updateLine = (i: number, field: keyof QuotationLine, value: string) => {
    const lines = [...form.lines];
    if (field === 'productId') {
      const product = products.find(p => p.id === value);
      lines[i] = product
        ? { ...lines[i], productId: value, description: product.name, unitPrice: String(product.price), itbisRate: product.itbisRate }
        : { ...lines[i], productId: '', description: '', unitPrice: '', itbisRate: 18 };
    } else {
      lines[i] = { ...lines[i], [field]: value };
    }
    setForm({ ...form, lines });
  };

  const addLine = () => setForm({ ...form, lines: [...form.lines, { ...emptyLine }] });

  const removeLine = (i: number) =>
    setForm({ ...form, lines: form.lines.filter((_, idx) => idx !== i) });

  const lineTotal = (l: QuotationLine) => (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0);
  const formTotal = form.lines.reduce((s, l) => s + lineTotal(l), 0);

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/quotations', {
        customerId: form.customerId || undefined,
        customerName: form.customerName || 'Consumidor Final',
        customerRncCedula: form.customerRncCedula || undefined,
        quoteDate: new Date(form.date).toISOString(),
        validUntil: form.validUntil ? new Date(form.validUntil).toISOString() : undefined,
        notes: form.notes || undefined,
        items: form.lines.map(l => ({
          productId: l.productId || undefined,
          description: l.description,
          quantity: Number(l.quantity),
          unitPrice: Number(l.unitPrice),
          itbisRate: l.itbisRate ?? 18,
        })),
      });
      toast.success('Cotización creada');
      setShowForm(false);
      setForm(emptyForm);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Error al crear cotización');
    } finally {
      setSubmitting(false);
    }
  };

  const statusMap: Record<string, string> = { send: 'SENT', accept: 'ACCEPTED', reject: 'REJECTED' };

  const changeStatus = async (id: string, action: 'send' | 'accept' | 'reject') => {
    try {
      await api.patch(`/quotations/${id}/status?status=${statusMap[action]}`);
      const labels: Record<string, string> = { send: 'Enviada', accept: 'Aceptada', reject: 'Rechazada' };
      toast.success(`Cotización ${labels[action]}`);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Error al cambiar estado');
    }
  };

  const convertToSale = async (id: string) => {
    setConverting(id);
    try {
      // Step 1: get the sale template from the quotation
      const templateRes = await api.get(`/quotations/${id}/convert-to-sale`);
      const template = templateRes.data.data ?? templateRes.data;

      // Step 2: create the draft sale — E31 if there's a customer RNC, else E32
      const saleRes = await api.post('/sales', {
        customerId: template.customerId ?? undefined,
        customerName: template.customerName ?? 'Consumidor Final',
        customerRncCedula: template.customerRncCedula ?? undefined,
        ncfType: template.customerRncCedula ? 'E31' : 'E32',
        paymentMethod: 'cash',
        saleDate: template.saleDate,
        notes: template.notes,
        items: template.items.map((i: any) => ({
          productId: i.productId ?? undefined,
          productName: i.productName ?? i.description,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          itbisRate: i.itbisRate ?? 18,
          discountPct: 0,
        })),
      });
      const draft = saleRes.data.data ?? saleRes.data;

      // Step 3: emit the sale (assigns NCF, decrements inventory, sends to DGII)
      await api.patch(`/sales/${draft.id}/issue`);

      // Step 4: mark quotation as converted (accepted) if not already
      await api.patch(`/quotations/${id}/status?status=ACCEPTED`).catch(() => {});

      toast.success('Cotización convertida en venta emitida — NCF asignado e inventario actualizado');
      router.push(`/dashboard/sales/${draft.id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Error al convertir cotización');
    } finally {
      setConverting(null);
    }
  };

  const viewDetail = async (id: string) => {
    try {
      const r = await api.get(`/quotations/${id}`);
      setDetail(r.data.data);
    } catch {
      toast.error('Error al cargar detalle');
    }
  };

  const printQuotation = async (q: Quotation) => {
    const tenant = await fetchTenantInfo();
    const lines = q.items ?? q.lines ?? [];
    const header = buildPrintHeader(tenant, 'COTIZACIÓN', q.quotationNumber ?? q.id.slice(0, 8));
    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Cotización ${q.quotationNumber ?? q.id}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #1e293b; padding: 40px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 28px; background: #f8fafc; padding: 16px; border-radius: 8px; }
    .info-row { display: flex; gap: 4px; }
    .info-label { color: #64748b; min-width: 80px; }
    .info-value { font-weight: 600; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    thead { background: #3b82f6; color: white; }
    th { padding: 10px 12px; text-align: left; font-weight: 600; }
    th.right { text-align: right; }
    td { padding: 9px 12px; border-bottom: 1px solid #e2e8f0; }
    td.right { text-align: right; }
    .total-row { background: #f1f5f9; font-weight: 700; font-size: 14px; }
    .notes { background: #fefce8; border-left: 4px solid #f59e0b; padding: 12px; border-radius: 4px; margin-bottom: 24px; color: #78350f; }
    .footer { text-align: center; color: #94a3b8; font-size: 11px; margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 16px; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  ${header}

  <div class="info-grid">
    <div class="info-row"><span class="info-label">Cliente:</span><span class="info-value">${q.customerName ?? '—'}</span></div>
    <div class="info-row"><span class="info-label">Fecha:</span><span class="info-value">${formatDate(q.quoteDate ?? q.date ?? '')}</span></div>
    <div class="info-row"><span class="info-label">Válida hasta:</span><span class="info-value">${q.validUntil ? formatDate(q.validUntil) : '—'}</span></div>
    <div class="info-row"><span class="info-label">Estado:</span><span class="info-value">${statusConfig[q.status]?.label ?? q.status}</span></div>
  </div>

  ${q.notes ? `<div class="notes"><strong>Notas:</strong> ${q.notes}</div>` : ''}

  <table>
    <thead>
      <tr>
        <th>Descripción</th>
        <th class="right" style="width:80px">Cant.</th>
        <th class="right" style="width:120px">Precio Unit.</th>
        <th class="right" style="width:120px">Total</th>
      </tr>
    </thead>
    <tbody>
      ${lines.map(l => `
      <tr>
        <td>${l.description}</td>
        <td class="right">${l.quantity}</td>
        <td class="right">RD$ ${Number(l.unitPrice).toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
        <td class="right">RD$ ${(Number(l.quantity) * Number(l.unitPrice)).toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
      </tr>`).join('')}
      <tr class="total-row">
        <td colspan="3" style="text-align:right;padding-right:12px;">TOTAL</td>
        <td class="right">RD$ ${q.total.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    Generado por FiscalRD — SM SOFTWARE SOLUTIONS &nbsp;|&nbsp; Documento no oficial sin firma digital
  </div>
</body>
</html>`;

    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.onload = () => { win.print(); };
  };

  return (
    <div>
      <PageHeader
        title="Cotizaciones"
        description="Gestión de cotizaciones y propuestas comerciales"
        action={
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
          >
            <Plus size={16} /> Nueva Cotización
          </button>
        }
      />

      {/* New quotation form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-700">Nueva Cotización</h3>
            <BranchBadge />
          </div>
          <form onSubmit={submitForm} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Cliente</label>
                <select
                  value={form.customerId}
                  onChange={e => {
                    const c = customers.find(c => c.id === e.target.value);
                    setForm({
                      ...form,
                      customerId: e.target.value,
                      customerName: c?.name ?? '',
                      customerRncCedula: c?.rncCedula ?? '',
                    });
                  }}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-1"
                >
                  <option value="">— Consumidor Final —</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.rncCedula})</option>
                  ))}
                </select>
                <input
                  placeholder="Nombre del cliente"
                  value={form.customerName}
                  onChange={e => setForm({ ...form, customerName: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Fecha</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => setForm({ ...form, date: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Válida hasta</label>
                <input
                  type="date"
                  value={form.validUntil}
                  onChange={e => setForm({ ...form, validUntil: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Notas</label>
              <textarea
                placeholder="Notas o términos de la cotización"
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                rows={2}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none"
              />
            </div>

            {/* Line items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-slate-500">Líneas</label>
                <button type="button" onClick={addLine} className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
                  <Plus size={12} /> Agregar línea
                </button>
              </div>
              <div className="space-y-2">
                <div className="hidden md:grid grid-cols-12 gap-2 text-xs font-medium text-slate-500 px-1">
                  <span className="col-span-5">Producto / Descripción</span>
                  <span className="col-span-2 text-right">Cant.</span>
                  <span className="col-span-2 text-right">Precio Unit.</span>
                  <span className="col-span-2 text-right">Total</span>
                  <span className="col-span-1"></span>
                </div>
                {form.lines.map((line, i) => (
                  <div key={i} className="space-y-1">
                    <div className="grid grid-cols-12 gap-2 items-start">
                      <div className="col-span-5 space-y-1">
                        <select
                          value={line.productId ?? ''}
                          onChange={e => updateLine(i, 'productId', e.target.value)}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                        >
                          <option value="">— Seleccionar del catálogo —</option>
                          {products.map(p => {
                            const stock = getStock(p.id);
                            return (
                              <option key={p.id} value={p.id} disabled={stock !== null && stock <= 0}>
                                {p.name} — {formatCurrency(p.price)}{stock !== null ? ` (stock: ${stock})` : ''}{stock !== null && stock <= 0 ? ' — SIN STOCK' : ''}
                              </option>
                            );
                          })}
                        </select>
                        <input
                          required
                          placeholder="Descripción del producto/servicio"
                          value={line.description}
                          onChange={e => updateLine(i, 'description', e.target.value)}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                        />
                      </div>
                      <input
                        required
                        type="number"
                        min="1"
                        step="1"
                        value={line.quantity}
                        onChange={e => updateLine(i, 'quantity', e.target.value)}
                        className="col-span-2 border border-slate-200 rounded-lg px-3 py-2 text-sm text-right"
                      />
                      <input
                        required
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={line.unitPrice}
                        onChange={e => updateLine(i, 'unitPrice', e.target.value)}
                        className="col-span-2 border border-slate-200 rounded-lg px-3 py-2 text-sm text-right"
                      />
                      <span className="col-span-2 text-right text-sm font-medium text-slate-700 pt-2">
                        {formatCurrency(lineTotal(line))}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeLine(i)}
                        disabled={form.lines.length === 1}
                        className="col-span-1 text-red-400 hover:text-red-600 text-xs disabled:opacity-30 text-center pt-2"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end mt-3 pt-3 border-t border-slate-100">
                <span className="text-sm font-semibold text-slate-700">Total: {formatCurrency(formTotal)}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Guardando...' : 'Crear Cotización'}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setForm(emptyForm); }}
                className="border border-slate-200 px-5 py-2 rounded-lg text-sm hover:bg-slate-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Detail modal */}
      {detail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl shadow-xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-700">
                Cotización {detail.quotationNumber ?? detail.id}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => printQuotation(detail)}
                  title="Imprimir / Guardar PDF"
                  className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 border border-blue-200 hover:border-blue-400 px-3 py-1.5 rounded-lg"
                >
                  <Printer size={14} /> Imprimir PDF
                </button>
                <button onClick={() => setDetail(null)} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
              <div><span className="text-slate-500">Cliente:</span> <span className="font-medium">{detail.customerName ?? '—'}</span></div>
              <div><span className="text-slate-500">Fecha:</span> <span className="font-medium">{formatDate(detail.quoteDate ?? detail.date ?? '')}</span></div>
              <div><span className="text-slate-500">Válida hasta:</span> <span className="font-medium">{detail.validUntil ? formatDate(detail.validUntil) : '—'}</span></div>
              <div>
                <span className="text-slate-500">Estado:</span>{' '}
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig[detail.status]?.color ?? ''}`}>
                  {statusConfig[detail.status]?.label ?? detail.status}
                </span>
              </div>
            </div>
            {detail.notes && <p className="text-sm text-slate-500 mb-4 italic">{detail.notes}</p>}
            {(detail.items ?? detail.lines ?? []).length > 0 && (
              <table className="w-full text-sm mb-4">
                <thead className="bg-slate-50"><tr>
                  <th className="text-left px-3 py-2 text-slate-500">Descripción</th>
                  <th className="text-right px-3 py-2 text-slate-500">Cant.</th>
                  <th className="text-right px-3 py-2 text-slate-500">Precio</th>
                  <th className="text-right px-3 py-2 text-slate-500">Total</th>
                </tr></thead>
                <tbody>
                  {(detail.items ?? detail.lines ?? []).map((l, i) => (
                    <tr key={i} className="border-b border-slate-50">
                      <td className="px-3 py-2">{l.description}</td>
                      <td className="px-3 py-2 text-right">{l.quantity}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(Number(l.unitPrice))}</td>
                      <td className="px-3 py-2 text-right font-medium">{formatCurrency(Number(l.quantity) * Number(l.unitPrice))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="flex justify-end text-sm font-bold border-t pt-3">
              Total: {formatCurrency(detail.total)}
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="text-left px-4 py-3 text-slate-500 font-medium">Nº Cotización</th>
              <th className="text-left px-4 py-3 text-slate-500 font-medium">Cliente</th>
              <th className="text-left px-4 py-3 text-slate-500 font-medium">Fecha</th>
              <th className="text-left px-4 py-3 text-slate-500 font-medium">Válida hasta</th>
              <th className="text-right px-4 py-3 text-slate-500 font-medium">Total</th>
              <th className="text-center px-4 py-3 text-slate-500 font-medium">Estado</th>
              <th className="text-right px-4 py-3 text-slate-500 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {quotations.length === 0 && (
              <tr><td colSpan={7} className="text-center py-8 text-slate-400">No hay cotizaciones registradas</td></tr>
            )}
            {quotations.map(q => {
              const sc = statusConfig[q.status] ?? { label: q.status, color: 'bg-slate-100 text-slate-600' };
              return (
                <tr key={q.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-slate-700">{q.quotationNumber ?? q.id.slice(0, 8)}</td>
                  <td className="px-4 py-3 text-slate-700">{q.customerName ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(q.quoteDate ?? q.date ?? '')}</td>
                  <td className="px-4 py-3 text-slate-500">{q.validUntil ? formatDate(q.validUntil) : '—'}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800">{formatCurrency(q.total)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sc.color}`}>{sc.label}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => viewDetail(q.id)} title="Ver detalle" className="text-slate-400 hover:text-slate-600">
                        <Eye size={15} />
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            const r = await api.get(`/quotations/${q.id}`);
                            printQuotation(r.data.data);
                          } catch { toast.error('Error al cargar cotización'); }
                        }}
                        title="Imprimir PDF"
                        className="text-slate-400 hover:text-blue-600"
                      >
                        <Printer size={15} />
                      </button>
                      {q.status === 'DRAFT' && (
                        <button onClick={() => changeStatus(q.id, 'send')} title="Enviar" className="text-blue-500 hover:text-blue-700">
                          <Send size={15} />
                        </button>
                      )}
                      {q.status === 'SENT' && (
                        <>
                          <button onClick={() => changeStatus(q.id, 'accept')} title="Aceptar" className="text-green-600 hover:text-green-700">
                            <CheckCircle size={15} />
                          </button>
                          <button onClick={() => changeStatus(q.id, 'reject')} title="Rechazar" className="text-red-500 hover:text-red-600">
                            <XCircle size={15} />
                          </button>
                        </>
                      )}
                      {q.status === 'ACCEPTED' && (
                        <button
                          onClick={() => convertToSale(q.id)}
                          disabled={converting === q.id}
                          title="Convertir en venta"
                          className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
                        >
                          <ShoppingCart size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
