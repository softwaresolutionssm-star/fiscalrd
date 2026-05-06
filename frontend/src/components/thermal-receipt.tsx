'use client';

export interface ThermalReceiptData {
  businessName: string;
  rnc: string;
  address?: string;
  phone?: string;
  logoUrl?: string;
  ncfNumber?: string;
  ncfType: string;
  saleDate: string;
  customerName?: string;
  customerRnc?: string;
  paymentMethod?: string;
  dueDate?: string;
  subtotal: number;
  itbisTotal: number;
  total: number;
  notes?: string;
  items: Array<{
    productName: string;
    quantity: number;
    unitPrice: number;
    discountPct?: number;
    itbisRate: number;
    total: number;
  }>;
}

const NCF_LABELS: Record<string, string> = {
  E31: 'Crédito Fiscal', E32: 'Consumidor Final', E33: 'Nota de Débito',
  E34: 'Nota de Crédito', E41: 'Gastos Menores', E44: 'Régimen Especial', E45: 'Gubernamental',
};

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia', credit: 'Crédito / Fiado',
};

function fmt(n: number) {
  return n.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d: string) {
  try {
    return new Date(d).toLocaleDateString('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return d; }
}

function pad(left: string, right: string, width = 32): string {
  const space = Math.max(1, width - left.length - right.length);
  return left + ' '.repeat(space) + right;
}

/** Generates a self-contained HTML string for the thermal receipt (80mm paper) */
export function buildThermalHtml(data: ThermalReceiptData): string {
  const itemRows = data.items.map(item => {
    const name = item.productName.length > 22 ? item.productName.slice(0, 21) + '…' : item.productName;
    const priceStr = item.discountPct
      ? `${item.quantity} x RD$${fmt(item.unitPrice)} (-${item.discountPct}%)`
      : `${item.quantity} x RD$${fmt(item.unitPrice)}`;
    const totalStr = `RD$${fmt(item.total)}`;
    return `
      <div style="margin-bottom:4px;">
        <div style="font-weight:bold;">${name}</div>
        <div style="display:flex;justify-content:space-between;padding-left:8px;">
          <span>${priceStr}</span>
          <span>${totalStr}</span>
        </div>
      </div>`;
  }).join('');

  const divider = `<div style="border-top:1px dashed #000;margin:6px 0;"></div>`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Recibo</title>
  <style>
    @page { size: 80mm auto; margin: 3mm 4mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 11px;
      line-height: 1.4;
      width: 72mm;
      color: #000;
      background: #fff;
    }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .big { font-size: 13px; }
    .small { font-size: 9px; }
    .row { display: flex; justify-content: space-between; }
    .total-row { font-weight: bold; font-size: 13px; border-top: 1px solid #000; padding-top: 3px; margin-top: 2px; }
  </style>
</head>
<body>
  ${data.logoUrl ? `<div class="center" style="margin-bottom:6px;"><img src="${data.logoUrl}" alt="Logo" style="max-height:48px;max-width:160px;object-fit:contain;" /></div>` : ''}
  <div class="center bold big" style="text-transform:uppercase;margin-bottom:2px;">${data.businessName}</div>
  <div class="center">RNC: ${data.rnc}</div>
  ${data.address ? `<div class="center small">${data.address}</div>` : ''}
  ${data.phone ? `<div class="center">Tel: ${data.phone}</div>` : ''}

  ${divider}

  <div class="row"><span class="bold">Fecha:</span><span>${fmtDate(data.saleDate)}</span></div>
  <div class="row"><span class="bold">Tipo:</span><span>${NCF_LABELS[data.ncfType] ?? data.ncfType}</span></div>
  ${data.ncfNumber ? `<div class="row"><span class="bold">NCF:</span><span>${data.ncfNumber}</span></div>` : ''}
  ${data.customerName ? `<div class="row"><span class="bold">Cliente:</span><span>${data.customerName}</span></div>` : ''}
  ${data.customerRnc ? `<div class="row"><span class="bold">RNC/Cédula:</span><span>${data.customerRnc}</span></div>` : ''}
  <div class="row"><span class="bold">Pago:</span><span>${PAYMENT_LABELS[data.paymentMethod ?? 'cash'] ?? data.paymentMethod}</span></div>
  ${data.paymentMethod === 'credit' && data.dueDate ? `<div class="row"><span class="bold">Vence:</span><span>${fmtDate(data.dueDate)}</span></div>` : ''}

  ${divider}

  ${itemRows}

  ${divider}

  <div class="row"><span>Subtotal:</span><span>RD$ ${fmt(data.subtotal)}</span></div>
  <div class="row"><span>ITBIS (18%):</span><span>RD$ ${fmt(data.itbisTotal)}</span></div>
  <div class="row total-row"><span>TOTAL:</span><span>RD$ ${fmt(data.total)}</span></div>

  ${data.notes ? `${divider}<div class="small">${data.notes}</div>` : ''}

  ${divider}

  <div class="center small" style="line-height:1.6;">
    <div>Comprobante Fiscal Electrónico (e-CF)</div>
    <div>Ley 32-23 — DGII República Dominicana</div>
    <div style="margin-top:4px;">¡Gracias por su compra!</div>
  </div>

  <script>window.onload = function(){ window.print(); window.onafterprint = function(){ window.close(); }; };<\/script>
</body>
</html>`;
}

/**
 * Opens a popup window and prints the thermal receipt (80mm).
 * Works reliably without CSS conflicts with the main page.
 */
export function printThermalReceipt(data: ThermalReceiptData): void {
  const html = buildThermalHtml(data);
  const win = window.open('', '_blank', 'width=320,height=600,toolbar=0,menubar=0,location=0');
  if (!win) {
    alert('Por favor permite ventanas emergentes para imprimir el recibo.');
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}
