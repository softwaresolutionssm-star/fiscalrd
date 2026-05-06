import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from './entities/customer.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customersRepo: Repository<Customer>,
  ) {}

  async create(tenantId: string, dto: CreateCustomerDto): Promise<Customer> {
    const customer = this.customersRepo.create({ ...dto, tenantId });
    return this.customersRepo.save(customer);
  }

  async findAll(tenantId: string): Promise<Customer[]> {
    return this.customersRepo.find({ where: { tenantId } });
  }

  async findOne(id: string, tenantId: string): Promise<Customer> {
    const customer = await this.customersRepo.findOne({ where: { id, tenantId } });
    if (!customer) throw new NotFoundException(`Cliente ${id} no encontrado`);
    return customer;
  }

  async update(id: string, tenantId: string, dto: UpdateCustomerDto): Promise<Customer> {
    const customer = await this.findOne(id, tenantId);
    Object.assign(customer, dto);
    return this.customersRepo.save(customer);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const customer = await this.findOne(id, tenantId);
    await this.customersRepo.softRemove(customer);
  }

  // ─── Import CSV ────────────────────────────────────────────────────────────
  // Columnas: Nombre,Cédula/RNC,Email,Teléfono,Dirección,Límite de Crédito
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
      const name = col(row, ['nombre', 'name', 'cliente']);
      if (!name) { errors.push(`Fila ${i + 2}: nombre vacío`); continue; }

      const rnc = col(row, ['rnc']);
      const cedula = col(row, ['cedula', 'cedula']);
      const email = col(row, ['email', 'correo']);
      const phone = col(row, ['telefono', 'phone', 'tel']);
      const address = col(row, ['direccion', 'address']);
      const creditRaw = col(row, ['credito', 'credit', 'limite']);
      const creditLimit = parseFloat(creditRaw.replace(/[^0-9.]/g, '')) || undefined;

      const rncOrNull = rnc?.match(/^\d{9}$/) ? rnc : undefined;
      const cedulaOrNull = cedula?.match(/^\d{11}$/) ? cedula : undefined;

      try {
        await this.customersRepo.save(this.customersRepo.create({
          tenantId, name,
          rnc: rncOrNull,
          cedula: cedulaOrNull,
          email: email || undefined,
          phone: phone || undefined,
          address: address || undefined,
          creditLimit,
        }));
        created++;
      } catch (e: any) {
        errors.push(`Fila ${i + 2}: ${e?.message ?? 'Error'}`);
      }
    }
    return { created, errors };
  }
}
