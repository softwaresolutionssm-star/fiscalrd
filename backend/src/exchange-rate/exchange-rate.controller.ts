import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ExchangeRateService } from './exchange-rate.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('exchange-rate')
export class ExchangeRateController {
  constructor(private readonly service: ExchangeRateService) {}

  @Get()
  getCurrent() {
    return this.service.getCurrentRate();
  }

  @Post('refresh')
  @UseGuards(JwtAuthGuard)
  forceRefresh() {
    return this.service.fetchAndSave();
  }
}
