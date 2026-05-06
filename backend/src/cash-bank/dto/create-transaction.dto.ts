import { IsString, IsEnum, IsDateString, IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { TransactionType, PaymentMethod, TransactionCategory } from '../entities/cash-transaction.entity';

export class CreateTransactionDto {
  @IsEnum(TransactionType) type: TransactionType;
  @IsEnum(PaymentMethod) @IsOptional() method?: PaymentMethod;
  @IsEnum(TransactionCategory) @IsOptional() category?: TransactionCategory;
  @IsDateString() transactionDate: string;
  @IsString() description: string;
  @IsNumber() @Min(0.01) @Type(() => Number) amount: number;
  @IsString() @IsOptional() reference?: string;
  @IsString() @IsOptional() bankAccount?: string;
  @IsString() @IsOptional() notes?: string;
}
