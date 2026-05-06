import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Employee } from './entities/employee.entity';
import { EmployeeBranchHistory } from './entities/employee-branch-history.entity';
import { CashRegisterSession, SessionStatus } from '../cash-register/entities/cash-register-session.entity';
import { User } from '../users/entities/user.entity';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeesRepo: Repository<Employee>,
    @InjectRepository(EmployeeBranchHistory)
    private readonly historyRepo: Repository<EmployeeBranchHistory>,
    @InjectRepository(CashRegisterSession)
    private readonly cashSessionRepo: Repository<CashRegisterSession>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async create(tenantId: string, userBranchId: string | null, dto: CreateEmployeeDto): Promise<Employee> {
    const branchId = userBranchId !== null ? userBranchId : (dto.branchId ?? null);
    const employee = this.employeesRepo.create({ ...dto, tenantId, branchId });
    return this.employeesRepo.save(employee);
  }

  async findAll(tenantId: string, branchId: string | null): Promise<Employee[]> {
    // Load all employees for tenant (unfiltered) so we can backfill branchId from linked users
    const all = await this.employeesRepo.find({ where: { tenantId } });

    // Backfill branchId from linked user for employees that have userId but no branchId
    const orphaned = all.filter(e => e.userId && !e.branchId);
    if (orphaned.length > 0) {
      const userIds = orphaned.map(e => e.userId!);
      const users = await this.userRepo.find({ where: { id: In(userIds) } });
      const userMap = new Map(users.map(u => [u.id, u]));
      for (const emp of orphaned) {
        const linkedUser = userMap.get(emp.userId!);
        if (linkedUser?.branchId) {
          emp.branchId = linkedUser.branchId;
          await this.employeesRepo.update(emp.id, { branchId: linkedUser.branchId });
        }
      }
    }

    // Apply branchId filter after backfill
    if (branchId !== null) {
      return all.filter(e => e.branchId === branchId);
    }
    return all;
  }

  async findOne(id: string, tenantId: string): Promise<Employee> {
    const employee = await this.employeesRepo.findOne({ where: { id, tenantId } });
    if (!employee) throw new NotFoundException(`Empleado ${id} no encontrado`);
    return employee;
  }

  async findByUser(tenantId: string, email: string, firstName: string, lastName: string): Promise<Employee | null> {
    if (email) {
      const byEmail = await this.employeesRepo.findOne({ where: { tenantId, email } });
      if (byEmail) return byEmail;
    }
    return this.employeesRepo.findOne({ where: { tenantId, firstName, lastName } }) ?? null;
  }

  async update(id: string, tenantId: string, dto: UpdateEmployeeDto): Promise<Employee> {
    const employee = await this.findOne(id, tenantId);
    Object.assign(employee, dto);
    return this.employeesRepo.save(employee);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const employee = await this.findOne(id, tenantId);
    await this.employeesRepo.softRemove(employee);
  }

  async transferBranch(
    id: string,
    tenantId: string,
    branchId: string | null,
    actor: { id: string; name: string },
    notes?: string,
  ): Promise<Employee> {
    const employee = await this.findOne(id, tenantId);

    // Block transfer if employee has an open cash register session
    if (employee.userId) {
      const openSession = await this.cashSessionRepo.findOne({
        where: { tenantId, openedById: employee.userId, status: SessionStatus.OPEN },
      });
      if (openSession) {
        throw new BadRequestException(
          'El empleado tiene una sesión de caja abierta. Cierra la caja antes de transferirlo.',
        );
      }
    }

    const fromBranchId = employee.branchId;
    employee.branchId = branchId;
    await this.employeesRepo.save(employee);

    // Record history
    await this.historyRepo.save(this.historyRepo.create({
      tenantId,
      employeeId: id,
      fromBranchId,
      toBranchId: branchId,
      transferredById: actor.id,
      transferredByName: actor.name,
      notes: notes ?? null,
    }));

    return employee;
  }

  async getBranchHistory(id: string, tenantId: string): Promise<EmployeeBranchHistory[]> {
    // Verify employee belongs to tenant
    await this.findOne(id, tenantId);
    return this.historyRepo.find({
      where: { employeeId: id, tenantId },
      order: { createdAt: 'DESC' },
    });
  }
}
