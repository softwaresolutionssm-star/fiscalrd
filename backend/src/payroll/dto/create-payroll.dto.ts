import { IsString, IsUUID, IsNumber, IsOptional, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { PayrollType, PayrollFrequency } from '../entities/payroll.entity';

export class CreatePayrollDto {
  @IsUUID()
  employeeId: string;

  @IsString()
  period: string; // "2026-03"

  @IsString()
  @IsOptional()
  periodStart?: string; // "2026-03-01"

  @IsString()
  @IsOptional()
  periodEnd?: string;   // "2026-03-07"

  @IsEnum(PayrollType)
  @IsOptional()
  type?: PayrollType;

  @IsEnum(PayrollFrequency)
  @IsOptional()
  frequency?: PayrollFrequency;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  baseSalary: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  overtime?: number; // flat amount OR auto-calculated from hours below

  // Horas extras por tipo (Código Laboral RD)
  @IsNumber() @Min(0) @IsOptional() @Type(() => Number) overtimeHoursDiurnas?: number;   // 35% recargo
  @IsNumber() @Min(0) @IsOptional() @Type(() => Number) overtimeHoursNocturnas?: number; // 15% recargo
  @IsNumber() @Min(0) @IsOptional() @Type(() => Number) overtimeHoursFeriados?: number;  // 100% recargo (feriados)

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  bonuses?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  commission?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  otherDeductions?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}
