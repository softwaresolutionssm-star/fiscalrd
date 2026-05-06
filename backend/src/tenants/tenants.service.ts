import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from './entities/tenant.entity';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantsRepo: Repository<Tenant>,
  ) {}

  async create(dto: CreateTenantDto): Promise<Tenant> {
    const exists = await this.tenantsRepo.findOne({ where: { rnc: dto.rnc } });
    if (exists) throw new ConflictException(`Ya existe un tenant con RNC ${dto.rnc}`);
    const tenant = this.tenantsRepo.create(dto);
    return this.tenantsRepo.save(tenant);
  }

  async findAll(): Promise<Tenant[]> {
    return this.tenantsRepo.find();
  }

  async findOne(id: string): Promise<Tenant> {
    const tenant = await this.tenantsRepo.findOne({ where: { id } });
    if (!tenant) throw new NotFoundException(`Tenant ${id} no encontrado`);
    return tenant;
  }

  async findByRnc(rnc: string): Promise<Tenant | null> {
    return this.tenantsRepo.findOne({ where: { rnc } });
  }

  async update(id: string, dto: UpdateTenantDto): Promise<Tenant> {
    const tenant = await this.findOne(id);
    Object.assign(tenant, dto);
    return this.tenantsRepo.save(tenant);
  }

  async remove(id: string): Promise<void> {
    const tenant = await this.findOne(id);
    await this.tenantsRepo.softRemove(tenant);
  }
}
