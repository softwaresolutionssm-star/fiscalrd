'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface InvoiceItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  itbisRate: number;
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
  items: InvoiceItem[];
  issuer: {
    name: string;
    rnc: string;
    address: string;
    phone: string;
    logoUrl?: string | null;
  } | null;
}

const DGII_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  ACEPTADO:    { label: 'Aceptado por DGII',  color: '#16a34a' },
  PENDIENTE:   { label: 'Pendiente DGII',      color: '#d97706' },
  RECHAZADO:   { label: 'Rechazado por DGII',  color: '#dc2626' },
  NO_ENVIADO:  { label: 'No enviado a DGII',   color: '#6b7280' },
};

const PAYMENT_LABELS: Record<string, string> = {
  cash:     'Efectivo',
  card:     'Tarjeta',
  transfer: 'Transferencia',
  credit:   'Crédito',
};

const NCF_TYPE_LABELS: Record<string, string> = {
  E31: 'Factura de Crédito Fiscal (E31)',
  E32: 'Factura de Consumo (E32)',
  E33: 'Nota de Débito (E33)',
  E34: 'Nota de Crédito (E34)',
  E41: 'Compras (E41)',
  E43: 'Gastos Menores (E43)',
  E44: 'Regímenes Especiales (E44)',
  E45: 'Gubernamental (E45)',
};

function fmt(n: number) {
  return n.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 18, color: '#dc2626', marginBottom: 8 }}>{error}</p>
          <p style={{ color: '#6b7280', fontSize: 14 }}>Verifique que el enlace sea correcto o contacte al emisor.</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'sans-serif' }}>
        <p style={{ color: '#6b7280' }}>Cargando factura…</p>
      </div>
    );
  }

  const dgiiInfo = DGII_STATUS_LABELS[invoice.dgiiStatus] ?? { label: invoice.dgiiStatus, color: '#6b7280' };
  const dgiiValidationUrl = 'https://ecf.dgii.gov.do/';
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(dgiiValidationUrl)}`;

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: 720, margin: '0 auto', padding: '24px 16px', color: '#111' }}>
      {/* Print button — hidden when printing */}
      <div style={{ textAlign: 'right', marginBottom: 16 }} className="no-print">
        <button
          onClick={() => window.print()}
          style={{
            background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6,
            padding: '8px 20px', fontSize: 14, cursor: 'pointer',
          }}
        >
          Imprimir
        </button>
      </div>

      {/* Header */}
      <div style={{ borderBottom: '2px solid #2563eb', paddingBottom: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            {invoice.issuer?.logoUrl && (
              <img
                src={invoice.issuer.logoUrl}
                alt="Logo"
                style={{ height: 64, maxWidth: 140, objectFit: 'contain', borderRadius: 6 }}
              />
            )}
            <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1e3a8a' }}>
              {invoice.issuer?.name ?? 'Empresa'}
            </h1>
            {invoice.issuer?.rnc && (
              <p style={{ margin: '4px 0 0', fontSize: 13, color: '#374151' }}>RNC: {invoice.issuer.rnc}</p>
            )}
            {invoice.issuer?.address && (
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6b7280' }}>{invoice.issuer.address}</p>
            )}
            {invoice.issuer?.phone && (
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6b7280' }}>Tel: {invoice.issuer.phone}</p>
            )}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1e3a8a' }}>FACTURA</p>
            <p style={{ margin: '4px 0 0', fontSize: 14, fontWeight: 600 }}>{invoice.ncfNumber}</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6b7280' }}>
              {NCF_TYPE_LABELS[invoice.ncfType] ?? invoice.ncfType}
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 13 }}>
              Fecha: {new Date(invoice.saleDate).toLocaleDateString('es-DO', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
      </div>

      {/* Customer + status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 6, padding: '10px 14px', minWidth: 220 }}>
          <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cliente</p>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{invoice.customerName || 'Consumidor Final'}</p>
          {invoice.customerRncCedula && (
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#374151' }}>RNC/Cédula: {invoice.customerRncCedula}</p>
          )}
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#374151' }}>
            Pago: {PAYMENT_LABELS[invoice.paymentMethod] ?? invoice.paymentMethod}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <span style={{
            background: dgiiInfo.color, color: '#fff', borderRadius: 12,
            padding: '4px 12px', fontSize: 12, fontWeight: 600,
          }}>
            {dgiiInfo.label}
          </span>
          <img src={qrSrc} alt="QR DGII" width={100} height={100} style={{ borderRadius: 4 }} />
          <a href={dgiiValidationUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: '#2563eb' }}>
            Verificar en DGII
          </a>
        </div>
      </div>

      {/* Items table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 16 }}>
        <thead>
          <tr style={{ background: '#1e3a8a', color: '#fff' }}>
            <th style={{ padding: '8px 10px', textAlign: 'left' }}>Descripción</th>
            <th style={{ padding: '8px 10px', textAlign: 'right' }}>Cant.</th>
            <th style={{ padding: '8px 10px', textAlign: 'right' }}>Precio Unit.</th>
            <th style={{ padding: '8px 10px', textAlign: 'right' }}>ITBIS %</th>
            <th style={{ padding: '8px 10px', textAlign: 'right' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item, idx) => (
            <tr key={idx} style={{ background: idx % 2 === 0 ? '#fff' : '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <td style={{ padding: '8px 10px' }}>{item.productName}</td>
              <td style={{ padding: '8px 10px', textAlign: 'right' }}>{item.quantity}</td>
              <td style={{ padding: '8px 10px', textAlign: 'right' }}>RD$ {fmt(item.unitPrice)}</td>
              <td style={{ padding: '8px 10px', textAlign: 'right' }}>{item.itbisRate}%</td>
              <td style={{ padding: '8px 10px', textAlign: 'right' }}>RD$ {fmt(item.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ minWidth: 240 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
            <span style={{ color: '#6b7280' }}>Subtotal</span>
            <span>RD$ {fmt(invoice.subtotal)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
            <span style={{ color: '#6b7280' }}>ITBIS</span>
            <span>RD$ {fmt(invoice.itbisTotal)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 16, fontWeight: 700, borderTop: '2px solid #1e3a8a', marginTop: 4 }}>
            <span>TOTAL</span>
            <span>RD$ {fmt(invoice.total)}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: 32, textAlign: 'center', fontSize: 11, color: '#9ca3af', borderTop: '1px solid #e5e7eb', paddingTop: 12 }}>
        <p style={{ margin: 0 }}>Documento fiscal electrónico emitido bajo la normativa DGII de la República Dominicana.</p>
        <p style={{ margin: '4px 0 0' }}>Verifique la autenticidad en: {dgiiValidationUrl}</p>
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
