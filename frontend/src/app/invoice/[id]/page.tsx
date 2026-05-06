'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface InvoiceItem {
  productName: string;
  quantity: number;
  unitOfMeasure: string;
  unitPrice: number;
  itbisRate: number;
  itbisAmount: number;
  subtotal: number;
  total: number;
}

interface Invoice {
  id: string;
  ncfNumber: string;
  ncfType: string;
  saleDate: string;
  customerName: string;
  customerRncCedula: string;
  subtotal: number;
  itbisTotal: number;
  total: number;
  paymentMethod: string;
  dgiiStatus: string;
  securityCode: string | null;
  signatureDate: string | null;
  items: InvoiceItem[];
  issuer: {
    name: string;
    rnc: string;
    address: string;
    phone: string;
    logoUrl?: string | null;
  } | null;
}

// DGII official document titles (Ley 32-23)
const NCF_TITLES: Record<string, string> = {
  E31: 'Factura de Crédito Fiscal Electrónica',
  E32: 'Factura de Consumo Electrónica',
  E33: 'Nota de Débito Electrónica',
  E34: 'Nota de Crédito Electrónica',
  E41: 'Comprobante Electrónico de Compras',
  E43: 'Comprobante Electrónico para Gastos Menores',
  E44: 'Comprobante Electrónico para Regímenes Especiales',
  E45: 'Comprobante Electrónico Gubernamental',
  E46: 'Comprobante Electrónico para Exportaciones',
  E47: 'Comprobante Electrónico para Pagos al Exterior',
};

const DGII_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  ACEPTADO:   { label: 'Aceptado por DGII',  color: '#16a34a' },
  PENDIENTE:  { label: 'Pendiente DGII',      color: '#d97706' },
  RECHAZADO:  { label: 'Rechazado por DGII',  color: '#dc2626' },
  NO_ENVIADO: { label: 'No enviado a DGII',   color: '#6b7280' },
};

// Covers both our internal codes and DGII numeric codes 1-8
const PAYMENT_LABELS: Record<string, string> = {
  cash:     'Efectivo',
  transfer: 'Transferencia / Depósito',
  card:     'Tarjeta Débito/Crédito',
  credit:   'Venta a Crédito',
  mixed:    'Pago Mixto',
  '1':      'Efectivo',
  '2':      'Cheque / Transferencia / Depósito',
  '3':      'Tarjeta Débito/Crédito',
  '4':      'Venta a Crédito',
  '5':      'Bonos o Regalos',
  '6':      'Permuta',
  '7':      'Nota de Crédito',
  '8':      'Otros',
};

function fmt(n: number) {
  return n.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Converts any date string to DD-MM-YYYY (DGII format)
function toDGIIDate(d: string | null | undefined): string {
  if (!d) return '';
  const s = String(d).substring(0, 10); // YYYY-MM-DD
  const [y, m, day] = s.split('-');
  return `${day}-${m}-${y}`;
}

// Converts ISO datetime to DD-MM-YYYY HH:MM:SS in Santo Domingo time (UTC-4)
function toDGIIDateTime(d: string | null | undefined): string {
  if (!d) return '';
  const normalized = d.endsWith('Z') || d.includes('+') ? d : d + 'Z';
  const dt = new Date(normalized);
  // UTC-4 (America/Santo_Domingo has no DST)
  const sd = new Date(dt.getTime() - 4 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(sd.getUTCDate())}-${pad(sd.getUTCMonth() + 1)}-${sd.getUTCFullYear()} ${pad(sd.getUTCHours())}:${pad(sd.getUTCMinutes())}:${pad(sd.getUTCSeconds())}`;
}

// Human-readable date for display (not DGII format)
function fmtDate(d: string | null | undefined) {
  if (!d) return '—';
  return new Intl.DateTimeFormat('es-DO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Santo_Domingo',
  }).format(new Date(d.endsWith('Z') || d.includes('+') ? d : d + 'Z'));
}

export default function PublicInvoicePage() {
  const params = useParams();
  const id = params?.id as string;
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';
    fetch(`${base}/invoices/${id}`)
      .then(r => r.json())
      .then(r => {
        const data = r.data ?? r;
        if (data && data.id) setInvoice(data);
        else setError('Factura no encontrada');
      })
      .catch(() => setError('Error cargando factura'));
  }, [id]);

  if (error) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 18, color: '#dc2626', marginBottom: 8 }}>{error}</p>
        <p style={{ color: '#6b7280', fontSize: 14 }}>Verifique que el enlace sea correcto o contacte al emisor.</p>
      </div>
    </div>
  );

  if (!invoice) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <p style={{ color: '#6b7280' }}>Cargando factura…</p>
    </div>
  );

  const dgiiInfo = DGII_STATUS_LABELS[invoice.dgiiStatus] ?? { label: invoice.dgiiStatus, color: '#6b7280' };
  const ncfTitle = NCF_TITLES[invoice.ncfType] ?? 'Comprobante Fiscal Electrónico';

  // Build DGII-compliant verification URL per Ley 32-23
  // E32 (Consumo) → fc.dgii.gov.do/eCF/ConsultaTimbreFC
  // All others    → ecf.dgii.gov.do/ecf/ConsultaTimbre (full params)
  const isConsumerInvoice = invoice.ncfType === 'E32';
  const fechaEmision = toDGIIDate(invoice.saleDate);
  const fechaFirma   = toDGIIDateTime(invoice.signatureDate);
  const rncEmisor    = invoice.issuer?.rnc ?? '';
  const rncComprador = invoice.customerRncCedula || '00000000000';
  const encf         = invoice.ncfNumber ?? '';
  const montoTotal   = fmt(invoice.total).replace(/,/g, ''); // remove thousand separator

  let dgiiVerifyUrl: string;
  if (isConsumerInvoice) {
    dgiiVerifyUrl = `https://fc.dgii.gov.do/eCF/ConsultaTimbreFC?RncEmisor=${encodeURIComponent(rncEmisor)}&ENCF=${encodeURIComponent(encf)}&MontoTotal=${encodeURIComponent(montoTotal)}&Codigoseguridad=${encodeURIComponent(invoice.securityCode ?? '')}`;
  } else {
    dgiiVerifyUrl = `https://ecf.dgii.gov.do/ecf/ConsultaTimbre?RncEmisor=${encodeURIComponent(rncEmisor)}&RncComprador=${encodeURIComponent(rncComprador)}&ENCF=${encodeURIComponent(encf)}&FechaEmision=${encodeURIComponent(fechaEmision)}&MontoTotal=${encodeURIComponent(montoTotal)}&FechaFirma=${encodeURIComponent(fechaFirma)}&CodigoSeguridad=${encodeURIComponent(invoice.securityCode ?? '')}`;
  }

  // QR encodes the DGII verification URL (not raw data)
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${encodeURIComponent(dgiiVerifyUrl)}`;

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: 760, margin: '0 auto', padding: '24px 16px', color: '#111' }}>

      {/* Botón imprimir */}
      <div style={{ textAlign: 'right', marginBottom: 16 }} className="no-print">
        <button onClick={() => window.print()} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 20px', fontSize: 14, cursor: 'pointer' }}>
          Imprimir / Guardar PDF
        </button>
      </div>

      {/* ── ENCABEZADO ── */}
      <div style={{ borderBottom: '2px solid #1e3a8a', paddingBottom: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>

          {/* Emisor */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            {invoice.issuer?.logoUrl && (
              <img src={invoice.issuer.logoUrl} alt="Logo" style={{ height: 64, maxWidth: 140, objectFit: 'contain', borderRadius: 6 }} />
            )}
            <div>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1e3a8a' }}>{invoice.issuer?.name ?? 'Empresa'}</h1>
              {invoice.issuer?.rnc && <p style={{ margin: '4px 0 0', fontSize: 13, color: '#374151' }}>RNC: {invoice.issuer.rnc}</p>}
              {invoice.issuer?.address && <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6b7280' }}>{invoice.issuer.address}</p>}
              {invoice.issuer?.phone && <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6b7280' }}>Tel: {invoice.issuer.phone}</p>}
            </div>
          </div>

          {/* Tipo y número de e-NCF */}
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1e3a8a' }}>{ncfTitle}</p>
            <p style={{ margin: '6px 0 2px', fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>e-NCF</p>
            <p style={{ margin: 0, fontSize: 19, fontWeight: 700, letterSpacing: '0.06em', color: '#111', fontFamily: 'monospace' }}>{invoice.ncfNumber}</p>
            <p style={{ margin: '6px 0 0', fontSize: 12, color: '#6b7280' }}>
              Fecha Emisión: {new Date(invoice.saleDate).toLocaleDateString('es-DO', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}
            </p>
          </div>
        </div>
      </div>

      {/* ── CLIENTE + QR ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Datos del Cliente</p>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{invoice.customerName || 'Consumidor Final'}</p>
          {invoice.customerRncCedula && <p style={{ margin: '2px 0 0', fontSize: 13, color: '#374151' }}>RNC/Cédula: {invoice.customerRncCedula}</p>}
          <p style={{ margin: '6px 0 0', fontSize: 12, color: '#374151' }}>Forma de Pago: {PAYMENT_LABELS[invoice.paymentMethod] ?? invoice.paymentMethod}</p>
        </div>

        {/* QR + estado DGII */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <span style={{ background: dgiiInfo.color, color: '#fff', borderRadius: 12, padding: '4px 12px', fontSize: 11, fontWeight: 600, marginBottom: 4 }}>
            {dgiiInfo.label}
          </span>
          <div style={{ border: '2px solid #e5e7eb', borderRadius: 6, padding: 6, background: '#fff' }}>
            <a href={dgiiVerifyUrl} target="_blank" rel="noopener noreferrer">
              <img src={qrSrc} alt="Código QR DGII" width={130} height={130} />
            </a>
          </div>

          {/* Código de Seguridad — campo obligatorio en la RI según DGII */}
          {invoice.securityCode && (
            <p style={{ margin: '4px 0 0', fontSize: 10, color: '#374151', textAlign: 'center' }}>
              <strong>Cód. Seguridad:</strong> <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{invoice.securityCode}</span>
            </p>
          )}

          {/* Fecha y Hora de Firma Digital */}
          {invoice.signatureDate && (
            <p style={{ margin: '2px 0 0', fontSize: 10, color: '#374151', textAlign: 'center' }}>
              <strong>Firma Digital:</strong> {fmtDate(invoice.signatureDate)}
            </p>
          )}

          <a href={dgiiVerifyUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 9, color: '#2563eb', marginTop: 2 }}>
            Verificar en DGII
          </a>
        </div>
      </div>

      {/* ── TABLA DE ÍTEMS ── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 16 }}>
        <thead>
          <tr style={{ background: '#1e3a8a', color: '#fff' }}>
            <th style={{ padding: '8px 10px', textAlign: 'left' }}>Descripción</th>
            <th style={{ padding: '8px 6px', textAlign: 'center' }}>U/M</th>
            <th style={{ padding: '8px 6px', textAlign: 'right' }}>Cant.</th>
            <th style={{ padding: '8px 8px', textAlign: 'right' }}>Precio Unit.</th>
            <th style={{ padding: '8px 6px', textAlign: 'center' }}>ITBIS%</th>
            <th style={{ padding: '8px 8px', textAlign: 'right' }}>ITBIS</th>
            <th style={{ padding: '8px 8px', textAlign: 'right' }}>Valor Total</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item, idx) => (
            <tr key={idx} style={{ background: idx % 2 === 0 ? '#fff' : '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <td style={{ padding: '7px 10px' }}>{item.productName}</td>
              <td style={{ padding: '7px 6px', textAlign: 'center', color: '#6b7280', fontSize: 11 }}>{item.unitOfMeasure ?? 'UND'}</td>
              <td style={{ padding: '7px 6px', textAlign: 'right' }}>{item.quantity}</td>
              <td style={{ padding: '7px 8px', textAlign: 'right' }}>RD$ {fmt(item.unitPrice)}</td>
              <td style={{ padding: '7px 6px', textAlign: 'center', color: '#6b7280' }}>{item.itbisRate}%</td>
              <td style={{ padding: '7px 8px', textAlign: 'right' }}>RD$ {fmt(item.itbisAmount ?? 0)}</td>
              <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 600 }}>RD$ {fmt(item.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── TOTALES ── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ minWidth: 280 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
            <span style={{ color: '#6b7280' }}>Subtotal Gravado (Base ITBIS)</span>
            <span>RD$ {fmt(invoice.subtotal)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
            <span style={{ color: '#6b7280' }}>Total ITBIS</span>
            <span>RD$ {fmt(invoice.itbisTotal)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 17, fontWeight: 700, borderTop: '2px solid #1e3a8a', marginTop: 4 }}>
            <span>TOTAL A PAGAR</span>
            <span>RD$ {fmt(invoice.total)}</span>
          </div>
        </div>
      </div>

      {/* ── PIE ── */}
      <div style={{ marginTop: 28, textAlign: 'center', fontSize: 10, color: '#9ca3af', borderTop: '1px solid #e5e7eb', paddingTop: 12 }}>
        <p style={{ margin: 0, fontWeight: 600, color: '#6b7280' }}>Comprobante Fiscal Electrónico (e-CF) — Ley 32-23 — República Dominicana</p>
        <p style={{ margin: '3px 0 0' }}>Emitido mediante el Sistema FiscalRD. Verifique autenticidad en: <strong>ecf.dgii.gov.do</strong></p>
        {invoice.securityCode && (
          <p style={{ margin: '3px 0 0' }}>Código de Seguridad DGII: <strong style={{ fontFamily: 'monospace' }}>{invoice.securityCode}</strong></p>
        )}
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; }
        }
      `}</style>
    </div>
  );
}
