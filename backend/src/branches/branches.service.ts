import {
  Injectable, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { todayDR } from '../common/utils/date.utils';
import { Branch } from './entities/branch.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';


@Injectable()
export class BranchesService {
  constructor(
    @InjectRepository(Branch)   private branchRepo: Repository<Branch>,
    @InjectRepository(Tenant)   private tenantRepo: Repository<Tenant>,
  ) {}

  // ─── Helpers ────────────────────────────────────────────────────────────────

  async countActive(tenantId: string): Promise<number> {
    return this.branchRepo.count({ where: { tenantId, isActive: true, deletedAt: null as any } });
  }


  // ─── Asegurar sucursal principal ─────────────────────────────────────────────

  async ensureMainBranch(tenantId: string, businessName: string): Promise<Branch> {
    const existing = await this.branchRepo.findOne({ where: { tenantId, isMain: true } });
    if (existing) return existing;
    const branch = this.branchRepo.create({ tenantId, name: 'Principal', isMain: true, isActive: true });
    return this.branchRepo.save(branch);
  }

  // ─── CRUD ────────────────────────────────────────────────────────────────────

  async findAll(tenantId: string): Promise<Branch[]> {
    return this.branchRepo.find({ where: { tenantId }, order: { isMain: 'DESC', createdAt: 'ASC' } });
  }

  async findOne(tenantId: string, id: string): Promise<Branch> {
    const branch = await this.branchRepo.findOne({ where: { id, tenantId } });
    if (!branch) throw new NotFoundException('Sucursal no encontrada');
    return branch;
  }

  async create(tenantId: string, dto: CreateBranchDto): Promise<Branch> {
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    const maxBranches = Number(tenant?.maxBranches ?? 1);
    const currentCount = await this.branchRepo.count({ where: { tenantId } });
    if (currentCount >= maxBranches) {
      throw new BadRequestException(
        `Tu plan permite un máximo de ${maxBranches} sucursal${maxBranches !== 1 ? 'es' : ''}. Contacta a soporte para ampliar tu plan.`,
      );
    }
    const branch = this.branchRepo.create({ ...dto, tenantId, isMain: false });
    return this.branchRepo.save(branch);
  }

  async update(tenantId: string, id: string, dto: UpdateBranchDto): Promise<Branch> {
    const branch = await this.findOne(tenantId, id);
    Object.assign(branch, dto);
    return this.branchRepo.save(branch);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const branch = await this.findOne(tenantId, id);
    if (branch.isMain) throw new BadRequestException('No puedes eliminar la sucursal principal');
    await this.branchRepo.softRemove(branch);
  }

  // ─── Activar / Desactivar con validación ─────────────────────────────────────

  async getDeactivationWarnings(tenantId: string, id: string): Promise<{
    usersCount: number;
    employeesCount: number;
    openCashRegisters: number;
    pendingAR: number;
  }> {
    const branch = await this.findOne(tenantId, id);
    if (branch.isMain) throw new BadRequestException('No puedes desactivar la sucursal principal');

    // Use raw queries via repo manager to avoid importing every module
    const manager = this.branchRepo.manager;

    const [usersCount, employeesCount, openCashRegisters, pendingAR] = await Promise.all([
      manager.count('users', { where: { tenantId, branchId: id, isActive: true } } as any).catch(() => 0),
      manager.count('employees', { where: { tenantId, branchId: id, status: 'active' } } as any).catch(() => 0),
      manager.count('cash_register_sessions', { where: { tenantId, branchId: id, closedAt: null as any } } as any).catch(() => 0),
      manager.count('accounts_receivable', { where: { tenantId, branchId: id, status: 'pending' } } as any).catch(() => 0),
    ]);

    return { usersCount, employeesCount, openCashRegisters, pendingAR };
  }

  async toggleActive(tenantId: string, id: string, isActive: boolean): Promise<Branch> {
    const branch = await this.findOne(tenantId, id);
    if (branch.isMain && !isActive) throw new BadRequestException('No puedes desactivar la sucursal principal');
    branch.isActive = isActive;
    return this.branchRepo.save(branch);
  }

  // ─── Estadísticas por sucursal ────────────────────────────────────────────────

  async getBranchStats(tenantId: string): Promise<Array<{
    id: string;
    name: string;
    isMain: boolean;
    isActive: boolean;
    usersCount: number;
    employeesCount: number;
    salesToday: number;
    salesMonth: number;
  }>> {
    const branches = await this.findAll(tenantId);
    const manager = this.branchRepo.manager;

    const todayStr = todayDR();
    const [y, m] = todayStr.split('-');
    const monthStart = `${y}-${m}-01`;

    const results = await Promise.all(
      branches.map(async (b) => {
        // For the main branch, also count records with branchId = NULL
        // (data created before multi-branch was enabled belongs to the main branch)
        const branchFilter = b.isMain
          ? `("branchId" = $2 OR "branchId" IS NULL)`
          : `"branchId" = $2`;

        const [usersCount, employeesCount, salesTodayRaw, salesMonthRaw] = await Promise.all([
          manager.query(
            `SELECT COUNT(*) as count FROM users WHERE "tenantId" = $1 AND ${branchFilter} AND "deletedAt" IS NULL`,
            [tenantId, b.id],
          ).catch(() => [{ count: '0' }]),
          manager.query(
            `SELECT COUNT(*) as count FROM employees WHERE "tenantId" = $1 AND ${branchFilter} AND status = 'active' AND "deletedAt" IS NULL`,
            [tenantId, b.id],
          ).catch(() => [{ count: '0' }]),
          manager.query(
            `SELECT COALESCE(SUM(total), 0) as total FROM sales WHERE "tenantId" = $1 AND ${branchFilter} AND status = 'issued' AND "saleDate" = $3 AND "deletedAt" IS NULL`,
            [tenantId, b.id, todayStr],
          ).catch(() => [{ total: '0' }]),
          manager.query(
            `SELECT COALESCE(SUM(total), 0) as total FROM sales WHERE "tenantId" = $1 AND ${branchFilter} AND status = 'issued' AND "saleDate" >= $3 AND "deletedAt" IS NULL`,
            [tenantId, b.id, monthStart],
          ).catch(() => [{ total: '0' }]),
        ]);

        return {
          id: b.id,
          name: b.name,
          isMain: b.isMain,
          isActive: b.isActive,
          address: b.address,
          phone: b.phone,
          email: b.email,
          usersCount: parseInt(usersCount[0]?.count ?? '0', 10),
          employeesCount: parseInt(employeesCount[0]?.count ?? '0', 10),
          salesToday: parseFloat(salesTodayRaw[0]?.total ?? '0'),
          salesMonth: parseFloat(salesMonthRaw[0]?.total ?? '0'),
        };
      }),
    );

    return results;
  }

  // ─── Resumen para billing ─────────────────────────────────────────────────────

  async getBranchSummary(tenantId: string): Promise<{
    count: number;
    maxBranches: number;
    monthlyPrice: number;
    branches: Branch[];
  }> {
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    const existing = await this.branchRepo.findOne({ where: { tenantId, isMain: true } });
    if (!existing) {
      await this.ensureMainBranch(tenantId, tenant?.businessName ?? 'Principal');
    }

    const branches = await this.findAll(tenantId);
    const activeCount = branches.filter(b => b.isActive).length;
    // monthlyPrice es calculado por BillingService con el modelo plan × maxBranches
    // Aquí solo devolvemos 0 — el owner ve el precio real en /billing/me
    return { count: activeCount, maxBranches: tenant?.maxBranches ?? 1, monthlyPrice: 0, branches };
  }

}
