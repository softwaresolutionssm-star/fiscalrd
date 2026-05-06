import { IsString, IsOptional, IsNumber, IsDateString } from 'class-validator';

export class CreateAppointmentDto {
  @IsOptional() @IsString() customerId?: string;
  @IsString() customerName: string;
  @IsOptional() @IsString() customerPhone?: string;
  @IsOptional() @IsString() customerEmail?: string;
  @IsOptional() @IsString() employeeId?: string;
  @IsOptional() @IsString() employeeName?: string;
  @IsString() serviceName: string;
  @IsOptional() @IsNumber() durationMinutes?: number;
  @IsOptional() @IsNumber() servicePrice?: number;
  @IsString() appointmentDate: string; // YYYY-MM-DD
  @IsString() startTime: string; // HH:mm
  @IsOptional() @IsString() endTime?: string;
  @IsOptional() @IsString() notes?: string;
}

export class PublicBookAppointmentDto {
  @IsString() tenantId: string;
  @IsOptional() @IsString() branchId?: string;
  @IsString() customerName: string;
  @IsOptional() @IsString() customerPhone?: string;
  @IsOptional() @IsString() customerEmail?: string;
  @IsOptional() @IsString() employeeId?: string;
  @IsOptional() @IsString() employeeName?: string;
  @IsString() serviceName: string;
  @IsOptional() @IsNumber() durationMinutes?: number;
  @IsOptional() @IsNumber() servicePrice?: number;
  @IsString() appointmentDate: string;
  @IsString() startTime: string;
  @IsOptional() @IsString() endTime?: string;
  @IsOptional() @IsString() notes?: string;
}
