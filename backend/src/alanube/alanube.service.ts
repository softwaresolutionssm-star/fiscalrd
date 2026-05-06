import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface EcfItem {
  description: string;
  quantity: number;
  unitOfMeasure: string; // UND, KGM, LTR, MTR, etc.
  unitPrice: number;
  itbisRate: number;     // 18, 16, or 0
  subtotal: number;
  itbisAmount: number;
  total: number;
  indicadorBienoServicio?: 1 | 2; // 1=Bien, 2=Servicio (DGII)
}

export interface EcfPayload {
  // Emisor
  issuerRnc: string;
  issuerName: string;
  issuerAddress?: string;
  issuerPhone?: string;
  // Receptor
  receiverRncCedula?: string;
  receiverName?: string;
  // Comprobante
  ecfType: string;       // E31, E32, etc.
  sequence: string;      // e.g. E3200000001
  issueDate: string;     // YYYY-MM-DD
  relatedNcf?: string;   // NCF relacionado (E33/E34)
  // Totales
  subtotal: number;
  itbisTotal: number;
  total: number;
  items: EcfItem[];
  // Pago — FormaPago DGII: 1=Efectivo 2=Cheque/Transfer 3=Tarjeta 4=Crédito 5=Bonos 6=Permuta 7=Nota Crédito 8=Otros
  paymentMethod?: string;  // internal code: cash|transfer|card|credit|mixed
  paymentSplits?: Array<{ method: string; amount: number }>; // for mixed payments
  // Multimoneda (OtraMoneda en DGII XML — Ley 32-23 Art. 18)
  currency?: string;       // ISO currency code: USD, EUR, etc.
  exchangeRate?: number;   // DOP per 1 foreign currency unit
  totalForeign?: number;   // total in the foreign currency
}

export interface EcfResult {
  success: boolean;
  trackId?: string;
  dgiiStatus?: 'ACEPTADO' | 'RECHAZADO' | 'PENDIENTE';
  signedXml?: string;
  securityCode?: string;
  signatureDate?: string;
  errorMessage?: string;
}

// Maps our internal payment codes to DGII FormaPago numeric codes (Ley 32-23)
const PAYMENT_METHOD_CODES: Record<string, number> = {
  cash:     1, // Efectivo
  transfer: 2, // Cheque/Transferencia/Depósito
  card:     3, // Tarjeta Débito/Crédito
  credit:   4, // Venta a Crédito
  gift:     5, // Bonos o Regalos
  barter:   6, // Permuta
  note:     7, // Nota de Crédito
  mixed:    8, // Otros / Pago Mixto
};

function mapPaymentCode(method: string | undefined): number {
  if (!method) return 1;
  // Already a number string
  const n = Number(method);
  if (!isNaN(n) && n >= 1 && n <= 8) return n;
  return PAYMENT_METHOD_CODES[method] ?? 1;
}

@Injectable()
export class AlanubeService {
  private readonly logger = new Logger(AlanubeService.name);

  constructor(private readonly http: HttpService) {}

  async sendEcf(apiKey: string, sandbox: boolean, payload: EcfPayload): Promise<EcfResult> {
    const baseUrl = sandbox
      ? 'https://sandbox.alanube.co/dominicana/v1'
      : 'https://api.alanube.co/dominicana/v1';

    try {
      const response: any = await firstValueFrom(
        this.http.post(`${baseUrl}/invoices`, this.buildAlanubeBody(payload), {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }),
      );

      const data = response.data ?? {};
      this.logger.log(`e-CF enviado a Alanube: trackId=${data.trackId}`);

      return {
        success: true,
        trackId: data.trackId,
        dgiiStatus: data.status ?? 'PENDIENTE',
        signedXml: data.signedXml,
        securityCode: data.securityCode ?? data.codigoSeguridad ?? data.codigoSeguridadeCF ?? null,
        signatureDate: data.signatureDateTime ?? data.fechaHoraFirma ?? data.fechaFirma ?? null,
      };
    } catch (error: any) {
      const msg = error?.response?.data?.message ?? error?.message ?? 'Error desconocido';
      this.logger.error(`Error enviando e-CF a Alanube: ${msg}`);
      return { success: false, errorMessage: msg, dgiiStatus: 'RECHAZADO' };
    }
  }

  async getEcfStatus(apiKey: string, sandbox: boolean, trackId: string): Promise<EcfResult> {
    const baseUrl = sandbox
      ? 'https://sandbox.alanube.co/dominicana/v1'
      : 'https://api.alanube.co/dominicana/v1';

    try {
      const response: any = await firstValueFrom(
        this.http.get(`${baseUrl}/invoices/${trackId}`, {
          headers: { Authorization: `Bearer ${apiKey}` },
        }),
      );
      const data = response.data ?? {};
      return {
        success: true,
        trackId,
        dgiiStatus: data.status,
        securityCode: data.securityCode ?? data.codigoSeguridad ?? data.codigoSeguridadeCF ?? null,
        signatureDate: data.signatureDateTime ?? data.fechaHoraFirma ?? data.fechaFirma ?? null,
      };
    } catch (error: any) {
      return { success: false, errorMessage: error?.message };
    }
  }

  private buildAlanubeBody(payload: EcfPayload) {
    // Build payment section — use TablaFormasPago for split payments
    const paymentSection = (payload.paymentSplits && payload.paymentSplits.length > 0)
      ? {
          tablaFormasPago: payload.paymentSplits.map(p => ({
            formaPago: mapPaymentCode(p.method),
            montoPago: p.amount,
          })),
        }
      : { formaPago: mapPaymentCode(payload.paymentMethod) };

    return {
      issuer: {
        rnc: payload.issuerRnc,
        businessName: payload.issuerName,
        ...(payload.issuerAddress && { address: payload.issuerAddress }),
        ...(payload.issuerPhone && { phone: payload.issuerPhone }),
      },
      receiver: {
        // DGII requires "00000000000" for anonymous consumers (E32 sin RNC)
        rncCedula: payload.receiverRncCedula || '00000000000',
        name: payload.receiverName ?? 'Consumidor Final',
      },
      document: {
        type: payload.ecfType,
        sequence: payload.sequence,
        issueDate: payload.issueDate,
        ...paymentSection,
        ...(payload.relatedNcf && { relatedNcf: payload.relatedNcf }),
      },
      totals: {
        subtotal: payload.subtotal,
        itbis: payload.itbisTotal,
        total: payload.total,
      },
      // OtraMoneda: present when invoice is issued in a foreign currency (DGII Ley 32-23)
      ...(payload.currency && payload.currency !== 'DOP' && payload.exchangeRate && {
        otherCurrency: {
          currency: payload.currency,
          exchangeRate: payload.exchangeRate,
          total: payload.totalForeign ?? Math.round((payload.total / payload.exchangeRate) * 100) / 100,
          subtotal: Math.round((payload.subtotal / payload.exchangeRate) * 100) / 100,
          itbis: Math.round((payload.itbisTotal / payload.exchangeRate) * 100) / 100,
        },
      }),
      items: payload.items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitOfMeasure: item.unitOfMeasure ?? 'UND',
        unitPrice: item.unitPrice,
        itbisRate: item.itbisRate,
        subtotal: item.subtotal,
        itbisAmount: item.itbisAmount,
        total: item.total,
        // IndicadorBienoServicio: 1=Bien (default), 2=Servicio
        ...(item.indicadorBienoServicio && { indicadorBienoServicio: item.indicadorBienoServicio }),
      })),
    };
  }
}
