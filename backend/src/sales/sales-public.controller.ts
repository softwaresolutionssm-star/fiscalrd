import { Controller, Get, Param } from '@nestjs/common';
import { SalesService } from './sales.service';

@Controller('invoices')
export class SalesPublicController {
  constructor(private readonly salesService: SalesService) {}

  @Get(':id')
  findPublic(@Param('id') id: string) {
    return this.salesService.findPublic(id);
  }
}
