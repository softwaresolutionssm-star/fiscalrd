import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface EcfItem {
  description: string;
  quantity: number;
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
  // Receptor
  receiverRncCedula?: string;
  receiverName?: string;
  // Comprobante
  ecfType: string;       // E31, E32, etc.
  sequence: string;      // e.g. E3200000001
  issueDate: string;     // YYYY-MM-DD
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
  errorMessage?: string;
}

@Injectable()
export class AlanubeService {
  private readonly logger = new Logger(AlanubeService.name);

  constructor(private readonly http: HttpService) {}

  /**
   * Envía un e-CF a Alanube para firma y transmisión a la DGII.
   * @param apiKey  API key del negocio (tenant)
   * @param sandbox Si es true usa sandbox.alanube.co, si no api.alanube.co
   * @param payload Datos del comprobante
   */
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

      this.logger.log(`e-CF enviado a Alanube: trackId=${response.data?.trackId}`);

      return {
        success: true,
        trackId: response.data?.trackId,
        dgiiStatus: response.data?.status ?? 'PENDIENTE',
        signedXml: response.data?.signedXml,
      };
    } catch (error: any) {
      const msg = error?.response?.data?.message ?? error?.message ?? 'Error desconocido';
      this.logger.error(`Error enviando e-CF a Alanube: ${msg}`);

      return {
        success: false,
        errorMessage: msg,
        dgiiStatus: 'RECHAZADO',
      };
    }
  }

  /**
   * Consulta el estado de un e-CF en la DGII vía Alanube.
   */
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

      return {
        success: true,
        trackId,
        dgiiStatus: response.data?.status,
      };
    } catch (error: any) {
      return {
        success: false,
        errorMessage: error?.message,
      };
    }
  }

  private buildAlanubeBody(payload: EcfPayload) {
    return {
      issuer: {
        rnc: payload.issuerRnc,
        businessName: payload.issuerName,
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
      },
      totals: {
        subtotal: payload.subtotal,
        itbis: payload.itbisTotal,
        total: payload.total,
      },
      items: payload.items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        itbisRate: item.itbisRate,
        subtotal: item.subtotal,
        itbisAmount: item.itbisAmount,
        total: item.total,
      })),
    };
  }
}
