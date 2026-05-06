import { IsString, IsNumber, IsDateString, IsOptional, IsBoolean, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateExpenseDto {
  @IsString() category: string;
  @IsString() description: string;
  @IsNumber() @Min(0) @Type(() => Number) amount: number;
  @IsDateString() expenseDate: string;
  @IsString() @IsOptional() supplierName?: string;
  @IsString() @IsOptional() supplierRnc?: string;
  @IsString() @IsOptional() ncfNumber?: string;
  @IsString() @IsOptional() reference?: string;
  @IsString() @IsOptional() notes?: string;
  @IsBoolean() @IsOptional() hasItbis?: boolean;
  @IsNumber() @IsOptional() @Type(() => Number) itbisAmount?: number;
  @IsString() @IsOptional() paymentMethod?: string;
}
