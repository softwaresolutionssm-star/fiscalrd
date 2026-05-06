import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, Length, Matches } from 'class-validator';
import { Type } from 'class-transformer';
import { EmployeeStatus } from '../entities/employee.entity';

export class CreateEmployeeDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsString()
  @IsOptional()
  @Length(11, 11, { message: 'La cédula debe tener exactamente 11 dígitos' })
  @Matches(/^\d{11}$/, { message: 'La cédula debe contener solo dígitos' })
  cedula?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  position?: string;

  @IsString()
  @IsOptional()
  department?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  baseSalary?: number;

  @IsDateString()
  @IsOptional()
  hireDate?: string;

  @IsEnum(EmployeeStatus)
  @IsOptional()
  status?: EmployeeStatus;

  @IsString()
  @IsOptional()
  branchId?: string;

  @IsEnum(['WEEKLY', 'BIWEEKLY', 'MONTHLY'])
  @IsOptional()
  payrollFrequency?: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
}
