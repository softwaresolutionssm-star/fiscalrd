import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Supplier } from './entities/supplier.entity';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(Supplier)
    private readonly suppliersRepo: Repository<Supplier>,
  ) {}

  async create(tenantId: string, dto: CreateSupplierDto): Promise<Supplier> {
    const supplier = this.suppliersRepo.create({ ...dto, tenantId });
    return this.suppliersRepo.save(supplier);
  }

  async findAll(tenantId: string): Promise<Supplier[]> {
    return this.suppliersRepo.find({ where: { tenantId } });
  }

  async findOne(id: string, tenantId: string): Promise<Supplier> {
    const supplier = await this.suppliersRepo.findOne({ where: { id, tenantId } });
    if (!supplier) throw new NotFoundException(`Proveedor ${id} no encontrado`);
    return supplier;
  }

  async update(id: string, tenantId: string, dto: UpdateSupplierDto): Promise<Supplier> {
    const supplier = await this.findOne(id, tenantId);
    Object.assign(supplier, dto);
    return this.suppliersRepo.save(supplier);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const supplier = await this.findOne(id, tenantId);
    await this.suppliersRepo.softRemove(supplier);
  }
}
