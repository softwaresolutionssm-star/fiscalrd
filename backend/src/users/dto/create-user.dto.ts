import { IsEmail, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, IsUUID, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { UserRole } from '../../common/enums/roles.enum';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @IsUUID()
  @IsOptional()
  tenantId?: string;

  @IsString()
  @IsOptional()
  branchId?: string;

  // Optional: auto-create employee record linked to this user
  @IsString()
  @IsOptional()
  cedula?: string;

  @IsString()
  @IsOptional()
  position?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  baseSalary?: number;
}
