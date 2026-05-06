import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface EcfItem {
  description: string;
  quantity: number;
  unitOfMeasure: string; // UND, KGM, LTR, MTR, etc.
  unitPrice: number;
  itbisRate: number;
  subtotal: number;
  itbisAmount: number;
  total: number;
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
  // Pago
  paymentMethod?: string;
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
        securityCode: data.securityCode ?? data.codigoSeguridad ?? null,
        signatureDate: data.signatureDateTime ?? data.fechaFirma ?? null,
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
        securityCode: data.securityCode ?? data.codigoSeguridad ?? null,
        signatureDate: data.signatureDateTime ?? data.fechaFirma ?? null,
      };
    } catch (error: any) {
      return { success: false, errorMessage: error?.message };
    }
  }

  private buildAlanubeBody(payload: EcfPayload) {
    return {
      issuer: {
        rnc: payload.issuerRnc,
        businessName: payload.issuerName,
        ...(payload.issuerAddress && { address: payload.issuerAddress }),
        ...(payload.issuerPhone && { phone: payload.issuerPhone }),
      },
      receiver: {
        rncCedula: payload.receiverRncCedula ?? '',
        name: payload.receiverName ?? 'Consumidor Final',
      },
      document: {
        type: payload.ecfType,
        sequence: payload.sequence,
        issueDate: payload.issueDate,
        paymentMethod: payload.paymentMethod ?? 'efectivo',
        ...(payload.relatedNcf && { relatedNcf: payload.relatedNcf }),
      },
      totals: {
        subtotal: payload.subtotal,
        itbis: payload.itbisTotal,
        total: payload.total,
      },
      items: payload.items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitOfMeasure: item.unitOfMeasure ?? 'UND',
        unitPrice: item.unitPrice,
        itbisRate: item.itbisRate,
        subtotal: item.subtotal,
        itbisAmount: item.itbisAmount,
        total: item.total,
      })),
    };
  }
}
