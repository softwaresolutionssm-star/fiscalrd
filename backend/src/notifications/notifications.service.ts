import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification) private readonly repo: Repository<Notification>,
  ) {}

  async create(tenantId: string, type: string, title: string, message: string, link?: string): Promise<Notification> {
    return this.repo.save(this.repo.create({ tenantId, type, title, message, link }));
  }

  async findAll(tenantId: string, onlyUnread = false): Promise<Notification[]> {
    const where: any = { tenantId };
    if (onlyUnread) where.read = false;
    return this.repo.find({ where, order: { createdAt: 'DESC' }, take: 50 });
  }

  async countUnread(tenantId: string): Promise<number> {
    return this.repo.count({ where: { tenantId, read: false } });
  }

  async markAllRead(tenantId: string): Promise<void> {
    await this.repo.update({ tenantId, read: false }, { read: true });
  }

  async markOneRead(id: string, tenantId: string): Promise<void> {
    await this.repo.update({ id, tenantId }, { read: true });
  }
}
