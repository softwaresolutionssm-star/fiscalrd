import { IsString, IsDateString, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateArDto {
  @IsUUID() customerId: string;
  @IsString() @IsOptional() customerName?: string;
  @IsString() @IsOptional() saleId?: string;
  @IsString() @IsOptional() ncfNumber?: string;
  @IsDateString() issueDate: string;
  @IsDateString() dueDate: string;
  @IsNumber() @Min(0) @Type(() => Number) amount: number;
  @IsString() @IsOptional() notes?: string;
}

export class RegisterArPaymentDto {
  @IsDateString() paymentDate: string;
  @IsNumber() @Min(0.01) @Type(() => Number) amount: number;
  @IsString() @IsOptional() method?: string;
  @IsString() @IsOptional() reference?: string;
  @IsString() @IsOptional() notes?: string;
}
