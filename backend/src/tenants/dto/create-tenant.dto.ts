import { IsEmail, IsNotEmpty, IsNumber, IsOptional, IsString, Length, Matches, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTenantDto {
  @IsString()
  @IsNotEmpty()
  businessName: string;

  @IsString()
  @Length(9, 9, { message: 'El RNC debe tener exactamente 9 dígitos' })
  @Matches(/^\d{9}$/, { message: 'El RNC debe contener solo dígitos' })
  rnc: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  logoUrl?: string;

  @IsString()
  @IsOptional()
  website?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  cashFund?: number;
}
