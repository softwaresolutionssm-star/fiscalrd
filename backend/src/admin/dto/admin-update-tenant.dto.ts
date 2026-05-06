import { IsString, IsEmail, IsOptional, Length, IsEnum, IsBoolean, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { TenantPlan } from '../../common/enums/plan.enum';
import { BusinessType } from '../../common/enums/business-type.enum';

export class AdminUpdateTenantDto {
  @IsOptional()
  @IsString()
  businessName?: string;

  @IsOptional()
  @IsString()
  @Length(9, 9)
  rnc?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsEnum(TenantPlan)
  plan?: TenantPlan;

  @IsOptional()
  @IsBoolean()
  alanubeSandbox?: boolean;

  @IsOptional()
  @IsEnum(BusinessType)
  businessType?: BusinessType;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(999)
  @Type(() => Number)
  maxBranches?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  billingDiscountPct?: number;
}
