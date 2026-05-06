import { Controller, Post, Body, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sale } from '../sales/entities/sale.entity';

@Controller('alanube')
export class AlanubeController {
  private readonly logger = new Logger(AlanubeController.name);

  constructor(
    @InjectRepository(Sale) private saleRepo: Repository<Sale>,
  ) {}

  @Post('webhook')
  async handleWebhook(@Body() body: any) {
    try {
      const { trackId, status } = body;
      if (!trackId || !status) return { received: true };

      await this.saleRepo.update(
        { trackId } as any,
        { dgiiStatus: status } as any,
      );

      this.logger.log(`Webhook Alanube: trackId=${trackId} → ${status}`);
    } catch (e) {
      this.logger.error('Error procesando webhook Alanube', e);
    }
    return { received: true };
  }
}
