import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsEmail, Length, Matches, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { CustomerType } from '../entities/customer.entity';

export class CreateCustomerDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(CustomerType)
  @IsOptional()
  type?: CustomerType;

  @IsString()
  @IsOptional()
  @Length(11, 11, { message: 'La cédula debe tener exactamente 11 dígitos' })
  @Matches(/^\d{11}$/, { message: 'La cédula debe contener solo dígitos' })
  cedula?: string;

  @IsString()
  @IsOptional()
  @Length(9, 9, { message: 'El RNC debe tener exactamente 9 dígitos' })
  @Matches(/^\d{9}$/, { message: 'El RNC debe contener solo dígitos' })
  rnc?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  creditLimit?: number;
}
