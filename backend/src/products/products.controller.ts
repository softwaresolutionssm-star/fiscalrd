import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseUUIDPipe, NotFoundException, UseInterceptors, UploadedFile, BadRequestException, Query } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

interface AuthUser { id: string; tenantId: string; role: string; }

@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateProductDto) {
    return this.productsService.create(user.tenantId, dto);
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query('supplierId') supplierId?: string) {
    return this.productsService.findAll(user.tenantId, supplierId);
  }

  @Get('barcode/:code')
  async findByBarcode(@Param('code') code: string, @CurrentUser() user: AuthUser) {
    const product = await this.productsService.findByBarcode(user.tenantId, code);
    if (!product) throw new NotFoundException(`Producto con código de barras ${code} no encontrado`);
    return product;
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.productsService.findOne(id, user.tenantId);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, user.tenantId, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.productsService.remove(id, user.tenantId);
  }

  @Post('import/csv')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 2 * 1024 * 1024 } }))
  async importCsv(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: AuthUser) {
    if (!file) throw new BadRequestException('No se recibió ningún archivo');
    const text = file.buffer.toString('utf-8').replace(/^\uFEFF/, ''); // strip BOM
    return this.productsService.importFromCsv(user.tenantId, text);
  }
}
