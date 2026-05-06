import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepo: Repository<Product>,
  ) {}

  async create(tenantId: string, dto: CreateProductDto): Promise<Product> {
    const product = this.productsRepo.create({ ...dto, tenantId });
    return this.productsRepo.save(product);
  }

  async findAll(tenantId: string, supplierId?: string): Promise<Product[]> {
    const where: Record<string, any> = { tenantId, isActive: true };
    if (supplierId) where.supplierId = supplierId;
    return this.productsRepo.find({ where });
  }

  async findByBarcode(tenantId: string, barcode: string): Promise<Product | null> {
    return this.productsRepo.findOne({ where: { tenantId, barcode, isActive: true } });
  }

  async findOne(id: string, tenantId: string): Promise<Product> {
    const product = await this.productsRepo.findOne({ where: { id, tenantId } });
    if (!product) throw new NotFoundException(`Producto ${id} no encontrado`);
    return product;
  }

  async update(id: string, tenantId: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(id, tenantId);
    Object.assign(product, dto);
    return this.productsRepo.save(product);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const product = await this.findOne(id, tenantId);
    await this.productsRepo.softRemove(product);
  }

  // ─── Import CSV ────────────────────────────────────────────────────────────
  // Columnas esperadas: Nombre,Precio,ITBIS%,Código,Código de Barras,Stock Mínimo
  async importFromCsv(tenantId: string, csvText: string): Promise<{ created: number; errors: string[] }> {
    const lines = csvText.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return { created: 0, errors: ['CSV vacío o sin datos'] };

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-z0-9]/g, ''));
    const rows = lines.slice(1);
    const errors: string[] = [];
    let created = 0;

    const col = (row: string[], names: string[]) => {
      for (const n of names) {
        const idx = headers.findIndex(h => h.includes(n));
        if (idx >= 0) return row[idx]?.replace(/^"|"$/g, '').trim() ?? '';
      }
      return '';
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i].split(',');
      const name = col(row, ['nombre', 'name', 'producto']);
      const priceRaw = col(row, ['precio', 'price', 'costo']);
      const price = parseFloat(priceRaw.replace(/[^0-9.]/g, '')) || 0;

      if (!name) { errors.push(`Fila ${i + 2}: nombre vacío`); continue; }
      if (!price) { errors.push(`Fila ${i + 2}: precio inválido (${priceRaw})`); continue; }

      const itbisRaw = col(row, ['itbis', 'impuesto', 'iva']);
      const itbisRate = [0, 16, 18].includes(parseInt(itbisRaw)) ? parseInt(itbisRaw) : 18;
      const code = col(row, ['codigo', 'code', 'sku']);
      const barcode = col(row, ['barras', 'barcode', 'ean']);
      const minStockRaw = col(row, ['minimo', 'minstok', 'minstock']);
      const minStock = parseInt(minStockRaw) || 0;

      try {
        await this.productsRepo.save(this.productsRepo.create({ tenantId, name, price, itbisRate, code: code || undefined, barcode: barcode || undefined, minStock }));
        created++;
      } catch (e: any) {
        errors.push(`Fila ${i + 2}: ${e?.message ?? 'Error desconocido'}`);
      }
    }
    return { created, errors };
  }
}
