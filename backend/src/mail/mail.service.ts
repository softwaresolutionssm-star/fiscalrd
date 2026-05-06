import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private resend: Resend | null = null;
  private from: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    this.from = this.config.get<string>('MAIL_FROM') ?? 'FiscalRD <noreply@fiscalrd.do>';
    if (apiKey && apiKey !== 'your_resend_api_key') {
      this.resend = new Resend(apiKey);
    } else {
      this.logger.warn('RESEND_API_KEY not configured — emails will be logged to console only');
    }
  }

  async sendForgotPassword(to: string, token: string, businessName?: string): Promise<void> {
    const resetUrl = `${this.config.get('FRONTEND_URL') ?? 'http://localhost:3000'}/reset-password/${token}`;

    const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr><td style="background:#1e40af;padding:28px 40px;">
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">FiscalRD</h1>
          <p style="margin:4px 0 0;color:#93c5fd;font-size:13px;">Sistema e-CF — Ley 32-23</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:40px;">
          <h2 style="margin:0 0 16px;color:#1e293b;font-size:20px;">Recuperación de contraseña</h2>
          ${businessName ? `<p style="margin:0 0 20px;color:#475569;font-size:15px;">Hola, recibimos una solicitud para restablecer la contraseña de tu cuenta en <strong>${businessName}</strong>.</p>` : `<p style="margin:0 0 20px;color:#475569;font-size:15px;">Recibimos una solicitud para restablecer tu contraseña en FiscalRD.</p>`}
          <p style="margin:0 0 28px;color:#475569;font-size:15px;">Haz clic en el botón para crear una nueva contraseña. Este enlace expira en <strong>1 hora</strong>.</p>
          <div style="text-align:center;margin-bottom:32px;">
            <a href="${resetUrl}" style="display:inline-block;background:#1e40af;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:15px;font-weight:600;">Restablecer contraseña</a>
          </div>
          <p style="margin:0 0 8px;color:#94a3b8;font-size:13px;">Si no puedes hacer clic en el botón, copia este enlace:</p>
          <p style="margin:0;color:#3b82f6;font-size:12px;word-break:break-all;">${resetUrl}</p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0;">
          <p style="margin:0;color:#94a3b8;font-size:12px;">Si no solicitaste esto, ignora este email. Tu contraseña no cambiará.</p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#f8fafc;padding:16px 40px;border-top:1px solid #e2e8f0;">
          <p style="margin:0;color:#94a3b8;font-size:11px;text-align:center;">FiscalRD · Sistema de Facturación Electrónica · República Dominicana</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    await this.send({ to, subject: 'Restablecer tu contraseña — FiscalRD', html });
  }

  async sendInvoice(to: string, data: {
    businessName: string;
    rnc: string;
    ncfNumber?: string;
    ncfType: string;
    saleDate: string;
    customerName?: string;
    total: number;
    subtotal: number;
    itbisTotal: number;
    paymentMethod?: string;
    items: { productName: string; quantity: number; unitPrice: number; total: number }[];
    invoiceUrl: string;
  }): Promise<void> {
    const ncfLabels: Record<string, string> = {
      E31: 'Crédito Fiscal', E32: 'Consumidor Final', E33: 'Nota de Débito',
      E34: 'Nota de Crédito', E44: 'Régimen Especial', E45: 'Gubernamental',
    };
    const fmt = (n: number) => `RD$ ${Number(n).toLocaleString('es-DO', { minimumFractionDigits: 2 })}`;
    const rows = data.items.map(i =>
      `<tr><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;">${i.productName}</td><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:center;">${i.quantity}</td><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:right;">${fmt(i.unitPrice)}</td><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:600;">${fmt(i.total)}</td></tr>`
    ).join('');

    const html = `
<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr><td style="background:#1e40af;padding:28px 40px;">
          <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">${data.businessName}</h1>
          <p style="margin:4px 0 0;color:#93c5fd;font-size:13px;">RNC: ${data.rnc} · ${ncfLabels[data.ncfType] ?? data.ncfType}</p>
        </td></tr>
        <tr><td style="padding:32px 40px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:24px;">
            <div>
              <p style="margin:0;font-size:13px;color:#64748b;">Para:</p>
              <p style="margin:2px 0 0;font-size:15px;font-weight:600;color:#1e293b;">${data.customerName ?? 'Consumidor Final'}</p>
            </div>
            <div style="text-align:right;">
              ${data.ncfNumber ? `<p style="margin:0;font-size:20px;font-weight:700;font-family:monospace;color:#1e40af;">${data.ncfNumber}</p>` : ''}
              <p style="margin:2px 0 0;font-size:12px;color:#94a3b8;">${new Date(data.saleDate).toLocaleDateString('es-DO')}</p>
            </div>
          </div>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:20px;">
            <tr style="background:#f8fafc;"><th style="padding:10px 12px;text-align:left;font-size:12px;color:#64748b;">Descripción</th><th style="padding:10px 12px;font-size:12px;color:#64748b;">Cant.</th><th style="padding:10px 12px;font-size:12px;color:#64748b;text-align:right;">Precio</th><th style="padding:10px 12px;font-size:12px;color:#64748b;text-align:right;">Total</th></tr>
            ${rows}
          </table>
          <div style="text-align:right;">
            <p style="margin:0 0 4px;font-size:13px;color:#64748b;">Subtotal: ${fmt(data.subtotal)}</p>
            <p style="margin:0 0 4px;font-size:13px;color:#64748b;">ITBIS (18%): ${fmt(data.itbisTotal)}</p>
            <p style="margin:0;font-size:18px;font-weight:700;color:#1e293b;">TOTAL: ${fmt(data.total)}</p>
          </div>
          <div style="margin-top:24px;text-align:center;">
            <a href="${data.invoiceUrl}" style="display:inline-block;background:#1e40af;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;">Ver Factura Completa</a>
          </div>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
          <p style="margin:0;font-size:11px;color:#94a3b8;text-align:center;">Comprobante fiscal electrónico emitido bajo Ley 32-23 · República Dominicana</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

    await this.send({ to, subject: `Factura ${data.ncfNumber ?? ''} — ${data.businessName}`, html });
  }

  async sendWelcome(to: string, data: { firstName: string; businessName: string; loginUrl?: string }) {
    const url = data.loginUrl ?? `${this.config.get('FRONTEND_URL') ?? 'http://localhost:3000'}/login`;
    const html = `
<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr><td style="background:#1e40af;padding:28px 40px;">
          <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">FiscalRD</h1>
          <p style="margin:4px 0 0;color:#93c5fd;font-size:13px;">Sistema e-CF — Ley 32-23</p>
        </td></tr>
        <tr><td style="padding:40px;">
          <h2 style="margin:0 0 12px;color:#1e293b;font-size:20px;">¡Bienvenido, ${data.firstName}!</h2>
          <p style="margin:0 0 16px;color:#475569;font-size:15px;">Tu cuenta en <strong>FiscalRD</strong> ha sido creada para el negocio <strong>${data.businessName}</strong>.</p>
          <p style="margin:0 0 28px;color:#475569;font-size:15px;">Ya puedes acceder al sistema, emitir comprobantes fiscales electrónicos (e-CF), gestionar tus ventas y cumplir con la Ley 32-23.</p>
          <div style="text-align:center;margin-bottom:32px;">
            <a href="${url}" style="display:inline-block;background:#1e40af;color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:15px;font-weight:600;">Acceder al sistema</a>
          </div>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
          <p style="margin:0;color:#94a3b8;font-size:12px;">¿Necesitas ayuda? Contáctanos por WhatsApp al (809) 662-8402 o escríbenos a softwaresolutionssm@gmail.com</p>
        </td></tr>
        <tr><td style="background:#f8fafc;padding:16px 40px;border-top:1px solid #e2e8f0;">
          <p style="margin:0;color:#94a3b8;font-size:11px;text-align:center;">FiscalRD · SM SOFTWARE SOLUTIONS · República Dominicana</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
    await this.send({ to, subject: `Bienvenido a FiscalRD — ${data.businessName}`, html });
  }

  async sendLowStockAlert(to: string, businessName: string, items: { productName: string; currentStock: number; minStock: number }[]): Promise<void> {
    const rows = items.map(i =>
      `<tr><td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;">${i.productName}</td><td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;text-align:center;color:#dc2626;font-weight:600;">${i.currentStock}</td><td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;text-align:center;color:#64748b;">${i.minStock}</td></tr>`
    ).join('');

    const html = `
<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr><td style="background:#d97706;padding:28px 40px;">
          <h1 style="margin:0;color:#fff;font-size:20px;">⚠️ Alerta de stock bajo</h1>
          <p style="margin:4px 0 0;color:#fde68a;font-size:13px;">${businessName}</p>
        </td></tr>
        <tr><td style="padding:32px 40px;">
          <p style="margin:0 0 20px;color:#475569;font-size:15px;">Los siguientes productos tienen stock en o por debajo del mínimo configurado:</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
            <tr style="background:#f8fafc;"><th style="padding:10px 16px;text-align:left;font-size:13px;color:#64748b;">Producto</th><th style="padding:10px 16px;font-size:13px;color:#64748b;">Stock actual</th><th style="padding:10px 16px;font-size:13px;color:#64748b;">Mínimo</th></tr>
            ${rows}
          </table>
          <div style="margin-top:24px;text-align:center;">
            <a href="${this.config.get('FRONTEND_URL') ?? 'http://localhost:3000'}/dashboard/inventory" style="display:inline-block;background:#1e40af;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;">Ver inventario</a>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

    await this.send({ to, subject: `⚠️ Alerta de stock bajo — ${businessName}`, html });
  }

  async sendPaymentSubmitted(to: string, data: { businessName: string; period: string; amount: number; bankName: string; referenceNumber: string }) {
    const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
      <h2 style="color:#dc2626;">Nuevo Comprobante de Pago Recibido</h2>
      <p><strong>${data.businessName}</strong> envió un comprobante para el período <strong>${data.period}</strong>.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px;border:1px solid #e2e8f0;color:#64748b;">Monto</td><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;">RD$${data.amount.toLocaleString('es-DO')}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e2e8f0;color:#64748b;">Banco</td><td style="padding:8px;border:1px solid #e2e8f0;">${data.bankName}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e2e8f0;color:#64748b;">Referencia</td><td style="padding:8px;border:1px solid #e2e8f0;">${data.referenceNumber}</td></tr>
      </table>
      <p>Ingresa al panel de administración para aprobar o rechazar este pago.</p>
    </div>`;
    await this.send({ to, subject: `💰 Pago recibido — ${data.businessName} (${data.period})`, html });
  }

  async sendPaymentApproved(to: string, data: { businessName: string; period: string; amount: number }) {
    const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
      <h2 style="color:#16a34a;">✅ Pago Aprobado</h2>
      <p>Hola <strong>${data.businessName}</strong>, tu pago del período <strong>${data.period}</strong> fue <strong style="color:#16a34a;">aprobado</strong>.</p>
      <p style="font-size:24px;font-weight:bold;color:#0f172a;">RD$${data.amount.toLocaleString('es-DO')}</p>
      <p>Tu cuenta continúa activa. ¡Gracias por tu pago!</p>
      <p style="color:#64748b;font-size:13px;">— FiscalRD</p>
    </div>`;
    await this.send({ to, subject: `✅ Pago aprobado — ${data.period}`, html });
  }

  async sendPaymentRejected(to: string, data: { businessName: string; period: string; amount: number; reason: string }) {
    const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
      <h2 style="color:#dc2626;">❌ Pago Rechazado</h2>
      <p>Hola <strong>${data.businessName}</strong>, tu pago del período <strong>${data.period}</strong> fue <strong style="color:#dc2626;">rechazado</strong>.</p>
      <p><strong>Razón:</strong> ${data.reason}</p>
      <p>Por favor ingresa al sistema y vuelve a enviar el comprobante correcto.</p>
      <p style="color:#64748b;font-size:13px;">— FiscalRD</p>
    </div>`;
    await this.send({ to, subject: `❌ Pago rechazado — ${data.period}`, html });
  }

  async sendPaymentReminder(to: string, data: { businessName: string; period: string; amount: number; dueDate: string }) {
    const due = new Date(data.dueDate).toLocaleDateString('es-DO', { day: '2-digit', month: 'long', year: 'numeric' });
    const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
      <h2 style="color:#d97706;">⏰ Recordatorio de Pago — FiscalRD</h2>
      <p>Hola <strong>${data.businessName}</strong>,</p>
      <p>Tu período de pago <strong>${data.period}</strong> está abierto. Puedes realizar tu transferencia hasta el <strong>${due}</strong>.</p>
      <p style="font-size:20px;font-weight:bold;color:#1e293b;">Total: RD$${Number(data.amount).toLocaleString('es-DO', { minimumFractionDigits: 2 })}</p>
      <p>Accede a <strong>Mi Suscripción</strong> en tu dashboard para ver las instrucciones de pago y subir tu comprobante.</p>
      <p style="color:#64748b;font-size:13px;">Si ya realizaste el pago, ignora este mensaje. — FiscalRD</p>
    </div>`;
    await this.send({ to, subject: `⏰ Recordatorio de pago FiscalRD — ${data.period}`, html });
  }

  async sendBillingBlocked(to: string, data: { businessName: string; daysOverdue: number }) {
    const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
      <h2 style="color:#dc2626;">🔒 Cuenta Bloqueada por Falta de Pago</h2>
      <p>Hola <strong>${data.businessName}</strong>,</p>
      <p>Tu cuenta en FiscalRD ha sido <strong>bloqueada</strong> por llevar <strong>${data.daysOverdue} días</strong> sin pago.</p>
      <p>Para desbloquear tu cuenta, debes ponerte al día con tu suscripción. Contacta a soporte lo antes posible.</p>
      <p style="color:#64748b;font-size:13px;">— FiscalRD</p>
    </div>`;
    await this.send({ to, subject: `🔒 Tu cuenta FiscalRD fue bloqueada`, html });
  }

  async sendPayslip(to: string, data: {
    employeeName: string;
    businessName: string;
    period: string;
    periodDisplay: string;
    frequency: string;
    baseSalary: number;
    overtime: number;
    bonuses: number;
    commission: number;
    grossSalary: number;
    sfsEmployee: number;
    afpEmployee: number;
    isr: number;
    otherDeductions: number;
    totalDeductions: number;
    netSalary: number;
    paidAt?: Date | null;
  }): Promise<void> {
    const fmt = (n: number) => `RD$ ${Number(n).toLocaleString('es-DO', { minimumFractionDigits: 2 })}`;
    const html = `
<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr><td style="background:#1e40af;padding:28px 40px;">
          <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700;">${data.businessName}</h1>
          <p style="margin:4px 0 0;color:#93c5fd;font-size:13px;">Recibo de Pago · ${data.frequency}</p>
        </td></tr>
        <tr><td style="padding:32px 40px;">
          <h2 style="margin:0 0 4px;color:#1e293b;font-size:17px;">${data.employeeName}</h2>
          <p style="margin:0 0 24px;color:#64748b;font-size:13px;">Período: ${data.periodDisplay}</p>

          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:16px;">
            <tr style="background:#f8fafc;"><td colspan="2" style="padding:10px 16px;font-size:12px;font-weight:700;color:#374151;letter-spacing:.05em;text-transform:uppercase;">Ingresos</td></tr>
            <tr><td style="padding:8px 16px;border-top:1px solid #f1f5f9;color:#475569;">Salario Base</td><td style="padding:8px 16px;border-top:1px solid #f1f5f9;text-align:right;">${fmt(data.baseSalary)}</td></tr>
            ${data.overtime > 0 ? `<tr><td style="padding:8px 16px;border-top:1px solid #f1f5f9;color:#475569;">Horas Extras</td><td style="padding:8px 16px;border-top:1px solid #f1f5f9;text-align:right;">${fmt(data.overtime)}</td></tr>` : ''}
            ${data.bonuses > 0 ? `<tr><td style="padding:8px 16px;border-top:1px solid #f1f5f9;color:#475569;">Bonificaciones</td><td style="padding:8px 16px;border-top:1px solid #f1f5f9;text-align:right;">${fmt(data.bonuses)}</td></tr>` : ''}
            ${data.commission > 0 ? `<tr><td style="padding:8px 16px;border-top:1px solid #f1f5f9;color:#475569;">Comisiones</td><td style="padding:8px 16px;border-top:1px solid #f1f5f9;text-align:right;">${fmt(data.commission)}</td></tr>` : ''}
            <tr style="background:#f0f9ff;"><td style="padding:10px 16px;border-top:1px solid #bae6fd;font-weight:700;">Salario Bruto</td><td style="padding:10px 16px;border-top:1px solid #bae6fd;text-align:right;font-weight:700;">${fmt(data.grossSalary)}</td></tr>
          </table>

          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:20px;">
            <tr style="background:#f8fafc;"><td colspan="2" style="padding:10px 16px;font-size:12px;font-weight:700;color:#374151;letter-spacing:.05em;text-transform:uppercase;">Deducciones</td></tr>
            <tr><td style="padding:8px 16px;border-top:1px solid #f1f5f9;color:#475569;">SFS (3.04%)</td><td style="padding:8px 16px;border-top:1px solid #f1f5f9;text-align:right;color:#dc2626;">- ${fmt(data.sfsEmployee)}</td></tr>
            <tr><td style="padding:8px 16px;border-top:1px solid #f1f5f9;color:#475569;">AFP (2.87%)</td><td style="padding:8px 16px;border-top:1px solid #f1f5f9;text-align:right;color:#dc2626;">- ${fmt(data.afpEmployee)}</td></tr>
            <tr><td style="padding:8px 16px;border-top:1px solid #f1f5f9;color:#475569;">ISR</td><td style="padding:8px 16px;border-top:1px solid #f1f5f9;text-align:right;color:#dc2626;">- ${fmt(data.isr)}</td></tr>
            ${data.otherDeductions > 0 ? `<tr><td style="padding:8px 16px;border-top:1px solid #f1f5f9;color:#475569;">Otras Deducciones</td><td style="padding:8px 16px;border-top:1px solid #f1f5f9;text-align:right;color:#dc2626;">- ${fmt(data.otherDeductions)}</td></tr>` : ''}
          </table>

          <div style="background:#dcfce7;border:1px solid #86efac;border-radius:8px;padding:16px 20px;display:flex;justify-content:space-between;">
            <span style="font-size:16px;font-weight:700;color:#15803d;">SALARIO NETO</span>
            <span style="font-size:20px;font-weight:700;color:#15803d;">${fmt(data.netSalary)}</span>
          </div>
          ${data.paidAt ? `<p style="margin:12px 0 0;font-size:12px;color:#94a3b8;text-align:center;">Pagado el ${new Date(data.paidAt).toLocaleDateString('es-DO', { year:'numeric',month:'long',day:'numeric' })}</p>` : ''}
        </td></tr>
        <tr><td style="background:#f8fafc;padding:14px 40px;border-top:1px solid #e2e8f0;">
          <p style="margin:0;color:#94a3b8;font-size:11px;text-align:center;">FiscalRD · Sistema de Nómina · República Dominicana</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
    await this.send({ to, subject: `Recibo de Pago — ${data.period} · ${data.businessName}`, html });
  }

  async sendRaw(to: string, subject: string, html: string): Promise<void> {
    await this.send({ to, subject, html });
  }

  private async send({ to, subject, html }: { to: string; subject: string; html: string }): Promise<void> {
    if (!this.resend) {
      this.logger.log(`[EMAIL - console only] To: ${to} | Subject: ${subject}`);
      return;
    }
    try {
      await this.resend.emails.send({ from: this.from, to, subject, html });
      this.logger.log(`Email sent to ${to}: ${subject}`);
    } catch (err) {
      this.logger.error(`Failed to send email to ${to}: ${err}`);
    }
  }
}
