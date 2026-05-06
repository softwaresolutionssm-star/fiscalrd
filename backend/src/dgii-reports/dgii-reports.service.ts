import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Sale, SaleStatus } from '../sales/entities/sale.entity';
import { Purchase, PurchaseStatus } from '../purchases/entities/purchase.entity';
import { DgiiSubmission } from './entities/dgii-submission.entity';
import { Withholding } from '../withholdings/entities/withholding.entity';

export interface Report606Line {
  rnc: string;
  ncfType: string;
  ncfNumber: string;
  ncfDate: string;
  subtotal: number;
  itbis: number;
  total: number;
}

export interface Report607Line {
  rnc: string;
  customerName: string;
  ncfType: string;
  ncfNumber: string;
  ncfDate: string;
  subtotal: number;
  itbis: number;
  total: number;
  paymentMethod: string;
}

export interface Report608Line {
  ncfType: string;
  ncfNumber: string;
  cancellationDate: string;
}

@Injectable()
export class DgiiReportsService {
  constructor(
    @InjectRepository(Sale)
    private readonly salesRepo: Repository<Sale>,
    @InjectRepository(Purchase)
    private readonly purchaseRepo: Repository<Purchase>,
    @InjectRepository(DgiiSubmission)
    private readonly submissionRepo: Repository<DgiiSubmission>,
    @InjectRepository(Withholding)
    private readonly withholdingRepo: Repository<Withholding>,
  ) {}

  async report607(tenantId: string, year: number, month: number) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);

    const sales = await this.salesRepo.find({
      where: {
        tenantId,
        status: SaleStatus.ISSUED,
        saleDate: Between(start, end) as any,
      },
    });

    const lines: Report607Line[] = sales.map((s) => ({
      rnc: s.customerRncCedula ?? '',
      customerName: s.customerName ?? 'Consumidor Final',
      ncfType: s.ncfType,
      ncfNumber: s.ncfNumber ?? '',
      ncfDate: new Date(s.saleDate).toISOString().split('T')[0],
      subtotal: Number(s.subtotal),
      itbis: Number(s.itbisTotal),
      total: Number(s.total),
      paymentMethod: s.paymentMethod ?? 'cash',
    }));

    const totals = lines.reduce(
      (acc, l) => ({
        subtotal: acc.subtotal + l.subtotal,
        itbis: acc.itbis + l.itbis,
        total: acc.total + l.total,
      }),
      { subtotal: 0, itbis: 0, total: 0 },
    );

    return {
      period: `${year}-${String(month).padStart(2, '0')}`,
      totalRecords: lines.length,
      totals,
      lines,
    };
  }

  async report608(tenantId: string, year: number, month: number) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);

    const sales = await this.salesRepo.find({
      where: {
        tenantId,
        status: SaleStatus.CANCELLED,
        updatedAt: Between(start, end) as any,
      },
    });

    const lines: Report608Line[] = sales
      .filter((s) => s.ncfNumber)
      .map((s) => ({
        ncfType: s.ncfType,
        ncfNumber: s.ncfNumber ?? '',
        cancellationDate: new Date(s.updatedAt).toISOString().split('T')[0],
      }));

    return {
      period: `${year}-${String(month).padStart(2, '0')}`,
      totalRecords: lines.length,
      lines,
    };
  }

  async report606(tenantId: string, year: number, month: number) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);

    const purchases = await this.purchaseRepo.find({
      where: { tenantId, status: PurchaseStatus.CONFIRMED },
    });

    const filtered = purchases.filter(p => {
      const d = new Date(p.purchaseDate);
      return d >= start && d <= end;
    });

    const lines: Report606Line[] = filtered.map(p => ({
      rnc: p.supplierRnc ?? '',
      ncfType: p.ncfType ?? '',
      ncfNumber: p.ncfNumber ?? '',
      ncfDate: new Date(p.purchaseDate).toISOString().split('T')[0],
      subtotal: Number(p.subtotal),
      itbis: Number(p.itbisTotal),
      total: Number(p.total),
    }));

    const totals = lines.reduce(
      (acc, l) => ({ subtotal: acc.subtotal + l.subtotal, itbis: acc.itbis + l.itbis, total: acc.total + l.total }),
      { subtotal: 0, itbis: 0, total: 0 },
    );

    return {
      period: `${year}-${String(month).padStart(2, '0')}`,
      totalRecords: lines.length,
      totals,
      lines,
    };
  }

  async report623(tenantId: string, year: number, month: number) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);

    const withholdings = await this.withholdingRepo.find({
      where: { tenantId },
    });

    const filtered = withholdings.filter(w => {
      const d = new Date(w.withholdingDate);
      return d >= start && d <= end;
    });

    const lines = filtered.map(w => ({
      supplierName: w.supplierName ?? '',
      supplierRnc: w.supplierRnc ?? w.supplierCedula ?? '',
      ncfOriginal: w.ncfOriginal ?? '',
      date: new Date(w.withholdingDate).toISOString().split('T')[0],
      type: w.type,
      baseAmount: Number(w.baseAmount),
      withholdingRate: Number(w.withholdingRate),
      withholdingAmount: Number(w.withholdingAmount),
      netAmount: Number(w.netAmount),
    }));

    const totalRetencion = lines.reduce((acc, r) => acc + r.withholdingAmount, 0);
    return {
      period: `${year}-${String(month).padStart(2, '0')}`,
      totalRecords: lines.length,
      totalRetencion,
      lines,
    };
  }

  async validateRnc(rnc: string): Promise<{ valid: boolean; rnc: string; name?: string; status?: string }> {
    const cleaned = rnc.replace(/[-\s]/g, '');
    const isRnc = /^\d{9}$/.test(cleaned);
    const isCedula = /^\d{11}$/.test(cleaned);

    if (!isRnc && !isCedula) {
      return { valid: false, rnc: cleaned, status: 'Formato inválido. RNC: 9 dígitos, Cédula: 11 dígitos.' };
    }

    if (isRnc) {
      const weights = [7, 9, 8, 6, 5, 4, 3, 2];
      const digits = cleaned.split('').map(Number);
      const sum = weights.reduce((acc, w, i) => acc + w * digits[i], 0);
      const remainder = sum % 11;
      const checkDigit = remainder === 0 ? 0 : remainder === 1 ? 1 : 11 - remainder;
      if (checkDigit !== digits[8]) {
        return { valid: false, rnc: cleaned, status: 'Dígito verificador inválido' };
      }
    }

    return { valid: true, rnc: cleaned, status: 'Válido', name: 'Consulte el padrón DGII para el nombre' };
  }

  async it1Declaration(tenantId: string, year: number, month: number) {
    const [r607, r606] = await Promise.all([
      this.report607(tenantId, year, month),
      this.report606(tenantId, year, month),
    ]);

    const itbisVentas = r607.totals.itbis;       // ITBIS cobrado en ventas
    const itbisCompras = r606.totals.itbis;       // ITBIS pagado en compras (acreditable)
    const itbisPagar = Math.max(0, itbisVentas - itbisCompras); // Lo que se paga a la DGII

    return {
      period: `${year}-${String(month).padStart(2, '0')}`,
      itbisVentas,
      itbisCompras,
      itbisPagar,
      ventasGravadas: r607.totals.subtotal,
      ventasExentas: 0,
      totalVentas: r607.totals.total,
      totalCompras: r606.totals.total,
      note: 'Declaración IT-1 mensual de ITBIS. Presentar antes del día 20 del mes siguiente.',
    };
  }

  async summary(tenantId: string, year: number, month: number) {
    const r607 = await this.report607(tenantId, year, month);
    const r608 = await this.report608(tenantId, year, month);

    const byNcfType = r607.lines.reduce<Record<string, { count: number; total: number; itbis: number }>>(
      (acc, l) => {
        if (!acc[l.ncfType]) acc[l.ncfType] = { count: 0, total: 0, itbis: 0 };
        acc[l.ncfType].count += 1;
        acc[l.ncfType].total += l.total;
        acc[l.ncfType].itbis += l.itbis;
        return acc;
      },
      {},
    );

    return {
      period: `${year}-${String(month).padStart(2, '0')}`,
      sales: r607.totals,
      cancelled: r608.totalRecords,
      byNcfType,
    };
  }

  async generate607Txt(tenantId: string, year: number, month: number): Promise<string> {
    const report = await this.report607(tenantId, year, month);
    const lines: string[] = [];
    lines.push('RNC|TipoNCF|NCFNumero|FechaComprobante|MontoFacturado|ITBIS');
    for (const l of report.lines) {
      lines.push(`${l.rnc}|${l.ncfType}|${l.ncfNumber}|${l.ncfDate}|${l.subtotal.toFixed(2)}|${l.itbis.toFixed(2)}`);
    }
    lines.push(`TOTALES||||${report.totals.subtotal.toFixed(2)}|${report.totals.itbis.toFixed(2)}`);
    return lines.join('\r\n');
  }

  async generate608Txt(tenantId: string, year: number, month: number): Promise<string> {
    const report = await this.report608(tenantId, year, month);
    const lines: string[] = [];
    lines.push('TipoNCF|NCFNumero|FechaAnulacion');
    for (const l of report.lines) {
      lines.push(`${l.ncfType}|${l.ncfNumber}|${l.cancellationDate}`);
    }
    return lines.join('\r\n');
  }

  async generate606Txt(tenantId: string, year: number, month: number): Promise<string> {
    const report = await this.report606(tenantId, year, month);
    const lines: string[] = [];
    lines.push('RNC|TipoNCF|NCFNumero|FechaComprobante|MontoFacturado|ITBIS');
    for (const l of report.lines) {
      lines.push(`${l.rnc}|${l.ncfType}|${l.ncfNumber}|${l.ncfDate}|${l.subtotal.toFixed(2)}|${l.itbis.toFixed(2)}`);
    }
    lines.push(`TOTALES||||${report.totals.subtotal.toFixed(2)}|${report.totals.itbis.toFixed(2)}`);
    return lines.join('\r\n');
  }

  async generate623Txt(tenantId: string, year: number, month: number): Promise<string> {
    const report = await this.report623(tenantId, year, month);
    const lines: string[] = [];
    lines.push('RNCProveedor|NCFOriginal|TipoRetencion|MontoBase|TasaRetencion|MontoRetenido|MontoNeto|Fecha');
    for (const l of report.lines) {
      lines.push(
        `${l.supplierRnc}|${l.ncfOriginal}|${l.type}|${l.baseAmount.toFixed(2)}|${l.withholdingRate.toFixed(2)}|${l.withholdingAmount.toFixed(2)}|${l.netAmount.toFixed(2)}|${l.date}`,
      );
    }
    lines.push(`TOTAL RETENIDO|||||||${report.totalRetencion.toFixed(2)}`);
    return lines.join('\r\n');
  }

  async it1Annual(tenantId: string, year: number) {
    const months = await Promise.all(
      Array.from({ length: 12 }, (_, i) => this.it1Declaration(tenantId, year, i + 1)),
    );

    const annual = months.reduce(
      (acc, m) => ({
        itbisVentas:      acc.itbisVentas + m.itbisVentas,
        itbisCompras:     acc.itbisCompras + m.itbisCompras,
        itbisPagar:       acc.itbisPagar + m.itbisPagar,
        ventasGravadas:   acc.ventasGravadas + m.ventasGravadas,
        totalVentas:      acc.totalVentas + m.totalVentas,
        totalCompras:     acc.totalCompras + m.totalCompras,
      }),
      { itbisVentas: 0, itbisCompras: 0, itbisPagar: 0, ventasGravadas: 0, totalVentas: 0, totalCompras: 0 },
    );

    return {
      period: `${year}`,
      months: months.map((m, i) => ({ month: i + 1, ...m })),
      annual: {
        ...annual,
        note: `IT-1 Anual ${year}. Consolidado de 12 meses.`,
      },
    };
  }

  // ─── SUBMISSION TRACKING ────────────────────────────────────────────────────

  async markSubmitted(tenantId: string, reportType: string, period: string, submittedBy: string, notes?: string) {
    const existing = await this.submissionRepo.findOne({ where: { tenantId, reportType, period } });
    if (existing) {
      existing.submittedBy = submittedBy;
      existing.notes = notes ?? null;
      return this.submissionRepo.save(existing);
    }
    return this.submissionRepo.save(
      this.submissionRepo.create({ tenantId, reportType, period, submittedBy, notes: notes ?? null }),
    );
  }

  async getSubmissions(tenantId: string, year?: number) {
    const all = await this.submissionRepo.find({ where: { tenantId }, order: { createdAt: 'DESC' } });
    if (year) return all.filter(s => s.period.startsWith(String(year)));
    return all;
  }

  async deleteSubmission(tenantId: string, id: string) {
    const record = await this.submissionRepo.findOne({ where: { id, tenantId } });
    if (!record) return { success: false };
    await this.submissionRepo.delete(id);
    return { success: true };
  }
}
