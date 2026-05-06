import { IsString, IsEmail, IsOptional, MinLength, Length, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { TenantPlan } from '../../common/enums/plan.enum';
import { BusinessType } from '../../common/enums/business-type.enum';

export class AdminCreateTenantDto {
  @IsString()
  businessName: string;

  @IsString()
  @Length(9, 9, { message: 'El RNC debe tener exactamente 9 dígitos' })
  rnc: string;

  @IsEmail()
  businessEmail: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsEnum(TenantPlan)
  plan?: TenantPlan;

  @IsOptional()
  @IsEnum(BusinessType)
  businessType?: BusinessType;

  // Owner account
  @IsString()
  ownerFirstName: string;

  @IsString()
  ownerLastName: string;

  @IsEmail()
  ownerEmail: string;

  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  ownerPassword: string;

  // Plan de sucursales: máximo de sucursales que puede tener este tenant
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(999)
  @Type(() => Number)
  maxBranches?: number; // default 1
}
