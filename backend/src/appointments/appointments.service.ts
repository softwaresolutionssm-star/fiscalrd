import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Appointment, AppointmentStatus } from './entities/appointment.entity';
import { CreateAppointmentDto, PublicBookAppointmentDto } from './dto/create-appointment.dto';
import { randomBytes } from 'crypto';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(Appointment)
    private readonly repo: Repository<Appointment>,
  ) {}

  private calcEndTime(start: string, minutes: number): string {
    const [h, m] = start.split(':').map(Number);
    const total = h * 60 + m + minutes;
    return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  }

  private timesOverlap(s1: string, e1: string, s2: string, e2: string): boolean {
    return s1 < e2 && e1 > s2;
  }

  async checkAvailability(tenantId: string, date: string, employeeId?: string, branchId?: string | null): Promise<object> {
    const where: any = { tenantId, appointmentDate: date };
    if (employeeId) where.employeeId = employeeId;
    if (branchId) where.branchId = branchId;
    const appointments = await this.repo.find({
      where,
      order: { startTime: 'ASC' },
    });
    const active = appointments.filter(a => a.status !== AppointmentStatus.CANCELLED);
    const booked = active.map(a => ({ start: a.startTime, end: a.endTime ?? a.startTime, employeeName: a.employeeName, serviceName: a.serviceName }));
    return { date, booked, appointments: active };
  }

  async create(tenantId: string, dto: CreateAppointmentDto, branchId: string | null = null): Promise<Appointment> {
    const duration = dto.durationMinutes ?? 60;
    const endTime = dto.endTime ?? this.calcEndTime(dto.startTime, duration);
    const appt = this.repo.create({
      tenantId, branchId,
      customerId: dto.customerId,
      customerName: dto.customerName,
      customerPhone: dto.customerPhone,
      customerEmail: dto.customerEmail,
      employeeId: dto.employeeId,
      employeeName: dto.employeeName,
      serviceName: dto.serviceName,
      durationMinutes: duration,
      servicePrice: dto.servicePrice ?? 0,
      appointmentDate: dto.appointmentDate,
      startTime: dto.startTime,
      endTime,
      notes: dto.notes,
      publicToken: randomBytes(16).toString('hex'),
    });
    return this.repo.save(appt);
  }

  async publicBook(dto: PublicBookAppointmentDto): Promise<Appointment> {
    const duration = dto.durationMinutes ?? 60;
    const endTime = dto.endTime ?? this.calcEndTime(dto.startTime, duration);

    // Check overlap
    const existing = await this.repo.find({
      where: {
        tenantId: dto.tenantId,
        appointmentDate: dto.appointmentDate,
        ...(dto.employeeId ? { employeeId: dto.employeeId } : {}),
      },
    });
    const conflict = existing
      .filter(a => a.status !== AppointmentStatus.CANCELLED)
      .some(a => this.timesOverlap(dto.startTime, endTime, a.startTime, a.endTime ?? a.startTime));
    if (conflict) throw new BadRequestException('Ese horario ya está reservado. Por favor elige otro.');

    const appt = this.repo.create({
      tenantId: dto.tenantId,
      branchId: dto.branchId ?? null,
      customerName: dto.customerName,
      customerPhone: dto.customerPhone,
      customerEmail: dto.customerEmail,
      employeeId: dto.employeeId,
      employeeName: dto.employeeName,
      serviceName: dto.serviceName,
      durationMinutes: duration,
      servicePrice: dto.servicePrice ?? 0,
      appointmentDate: dto.appointmentDate,
      startTime: dto.startTime,
      endTime,
      notes: dto.notes,
      publicToken: randomBytes(16).toString('hex'),
    });
    return this.repo.save(appt);
  }

  async findAll(tenantId: string, branchId?: string | null, date?: string, employeeId?: string): Promise<Appointment[]> {
    const where: any = { tenantId };
    if (branchId) where.branchId = branchId;
    if (date) where.appointmentDate = date;
    if (employeeId) where.employeeId = employeeId;
    return this.repo.find({ where, order: { appointmentDate: 'DESC', startTime: 'ASC' } });
  }

  async updateStatus(id: string, tenantId: string, status: AppointmentStatus, cancelReason?: string): Promise<Appointment> {
    const a = await this.repo.findOne({ where: { id, tenantId } });
    if (!a) throw new NotFoundException('Cita no encontrada');
    a.status = status;
    if (cancelReason) a.cancelReason = cancelReason;
    return this.repo.save(a);
  }

  async cancelByToken(token: string): Promise<object> {
    const a = await this.repo.findOne({ where: { publicToken: token } });
    if (!a) throw new NotFoundException('Cita no encontrada');
    if (a.status === AppointmentStatus.CANCELLED) return { message: 'Esta cita ya estaba cancelada' };
    a.status = AppointmentStatus.CANCELLED;
    a.cancelReason = 'Cancelado por el cliente';
    await this.repo.save(a);
    return { success: true, message: 'Cita cancelada correctamente' };
  }

  async update(id: string, tenantId: string, dto: Partial<CreateAppointmentDto>): Promise<Appointment> {
    const a = await this.repo.findOne({ where: { id, tenantId } });
    if (!a) throw new NotFoundException('Cita no encontrada');
    Object.assign(a, dto);
    if (dto.startTime && dto.durationMinutes) a.endTime = this.calcEndTime(dto.startTime, dto.durationMinutes);
    return this.repo.save(a);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const a = await this.repo.findOne({ where: { id, tenantId } });
    if (!a) throw new NotFoundException('Cita no encontrada');
    await this.repo.softDelete(id);
  }

  async getTenantPublicInfo(tenantId: string): Promise<object> {
    // Returns minimal public info for the booking page
    const count = await this.repo.count({ where: { tenantId } });
    return { tenantId, active: count >= 0 };
  }
}
