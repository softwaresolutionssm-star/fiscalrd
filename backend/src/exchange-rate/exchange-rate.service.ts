import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { Cron } from '@nestjs/schedule';
import { firstValueFrom } from 'rxjs';
import { ExchangeRate } from './entities/exchange-rate.entity';

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour before fetching fresh data
const FALLBACK_RATE = 61.5;           // Used only if DB is empty and API fails

export interface RateResult {
  rate: number;
  fetchedAt: Date;
  source: string;
}

@Injectable()
export class ExchangeRateService {
  private readonly logger = new Logger(ExchangeRateService.name);

  constructor(
    @InjectRepository(ExchangeRate)
    private readonly repo: Repository<ExchangeRate>,
    private readonly http: HttpService,
  ) {}

  async getCurrentRate(): Promise<RateResult> {
    const latest = await this.repo.findOne({
      where: { baseCurrency: 'USD', targetCurrency: 'DOP' },
      order: { fetchedAt: 'DESC' },
    });

    if (latest && Date.now() - latest.fetchedAt.getTime() < CACHE_TTL_MS) {
      return { rate: Number(latest.rate), fetchedAt: latest.fetchedAt, source: latest.source ?? 'db' };
    }

    // Stale or missing — fetch fresh
    return this.fetchAndSave();
  }

  @Cron('0 * * * *') // Every hour on the dot
  async scheduledRefresh() {
    try {
      const result = await this.fetchAndSave();
      this.logger.log(`Tasa actualizada automáticamente: 1 USD = ${result.rate} DOP`);
    } catch (e: any) {
      this.logger.warn(`No se pudo actualizar tasa automáticamente: ${e.message}`);
    }
  }

  async fetchAndSave(): Promise<RateResult> {
    try {
      const response: any = await firstValueFrom(
        this.http.get('https://api.exchangerate-api.com/v4/latest/USD', { timeout: 10_000 }),
      );
      const rate = Number(response.data?.rates?.DOP);
      if (!rate || isNaN(rate) || rate < 10) throw new Error(`Tasa inválida recibida: ${rate}`);

      const entity = this.repo.create({
        baseCurrency: 'USD',
        targetCurrency: 'DOP',
        rate,
        source: 'exchangerate-api.com',
        fetchedAt: new Date(),
      });
      await this.repo.save(entity);
      return { rate, fetchedAt: entity.fetchedAt, source: entity.source };
    } catch (error: any) {
      this.logger.error(`Error al obtener tasa de cambio: ${error.message}`);

      // Fall back to latest DB value
      const fallback = await this.repo.findOne({
        where: { baseCurrency: 'USD', targetCurrency: 'DOP' },
        order: { fetchedAt: 'DESC' },
      });
      if (fallback) {
        return { rate: Number(fallback.rate), fetchedAt: fallback.fetchedAt, source: 'db-fallback' };
      }

      // Absolute last resort
      return { rate: FALLBACK_RATE, fetchedAt: new Date(), source: 'hardcoded-fallback' };
    }
  }
}
