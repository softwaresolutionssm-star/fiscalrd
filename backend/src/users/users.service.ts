import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    const exists = await this.usersRepo.findOne({ where: { email: dto.email } });
    if (exists) throw new ConflictException('El email ya está registrado');

    const hashed = await bcrypt.hash(dto.password, 10);
    const user = this.usersRepo.create({ ...dto, password: hashed });
    return this.usersRepo.save(user);
  }

  async findAll(tenantId?: string, branchId?: string | null, excludeUserId?: string): Promise<User[]> {
    const qb = this.usersRepo.createQueryBuilder('u')
      .select([
        'u.id', 'u.email', 'u.firstName', 'u.lastName',
        'u.role', 'u.isActive', 'u.isLocked', 'u.loginAttempts',
        'u.tenantId', 'u.branchId', 'u.pendingCashFund', 'u.pendingCashFundNote', 'u.pendingCashFundBy',
      ]);
    if (tenantId) {
      qb.where('u.tenantId = :tenantId', { tenantId });
    }
    if (branchId !== undefined && branchId !== null) {
      qb.andWhere('u.branchId = :branchId', { branchId });
    }
    if (excludeUserId) {
      qb.andWhere('u.id != :excludeUserId', { excludeUserId });
    }
    return qb.getMany() as Promise<User[]>;
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`Usuario ${id} no encontrado`);
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { email } });
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);
    Object.assign(user, dto);
    return this.usersRepo.save(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.usersRepo.softRemove(user);
  }

  async transferBranch(id: string, tenantId: string, branchId: string | null): Promise<User> {
    const user = await this.usersRepo.findOne({ where: { id, tenantId } });
    if (!user) throw new NotFoundException(`Usuario ${id} no encontrado`);
    (user as any).branchId = branchId;
    return this.usersRepo.save(user);
  }
}
