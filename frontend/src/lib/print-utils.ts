import api from './api';

export interface TenantPrintInfo {
  businessName: string;
  rnc: string;
  address?: string;
  phone?: string;
  email?: string;
  logoUrl?: string;
}

export async function fetchTenantInfo(): Promise<TenantPrintInfo | null> {
  try {
    const r = await api.get('/tenants/me');
    const t = r.data?.data ?? r.data;
    return {
      businessName: t.businessName ?? 'Mi Negocio',
      rnc: t.rnc ?? '',
      address: t.address,
      phone: t.phone,
      email: t.email,
      logoUrl: t.logoUrl,
    };
  } catch {
    return null;
  }
}

/** Returns the HTML block for the top of any printed document */
export function buildPrintHeader(tenant: TenantPrintInfo | null, docTitle: string, docSubtitle?: string): string {
  const logoHtml = tenant?.logoUrl
    ? `<img src="${tenant.logoUrl}" alt="Logo" style="height:60px;max-width:180px;object-fit:contain;" />`
    : `<div style="font-size:22px;font-weight:800;color:#1e40af;">${tenant?.businessName ?? 'Mi Negocio'}</div>`;

  return `
  <div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:20px;border-bottom:2px solid #3b82f6;margin-bottom:28px;">
    <div style="display:flex;align-items:center;gap:14px;">
      ${logoHtml}
      <div>
        <div style="font-size:15px;font-weight:700;color:#1e293b;">${tenant?.businessName ?? 'Mi Negocio'}</div>
        ${tenant?.rnc ? `<div style="font-size:12px;color:#64748b;">RNC: ${tenant.rnc}</div>` : ''}
        ${tenant?.address ? `<div style="font-size:11px;color:#94a3b8;">${tenant.address}</div>` : ''}
        ${tenant?.phone ? `<div style="font-size:11px;color:#94a3b8;">${tenant.phone}</div>` : ''}
      </div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:24px;font-weight:700;color:#3b82f6;">${docTitle}</div>
      ${docSubtitle ? `<div style="font-size:12px;color:#64748b;margin-top:2px;">${docSubtitle}</div>` : ''}
    </div>
  </div>`;
}
