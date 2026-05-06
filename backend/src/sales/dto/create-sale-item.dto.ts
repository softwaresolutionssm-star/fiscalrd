import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSaleItemDto {
  @IsUUID()
  @IsOptional()
  productId?: string;

  @IsString()
  @IsNotEmpty()
  productName: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Type(() => Number)
  unitPrice: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Type(() => Number)
  quantity: number;

  @IsIn([0, 16, 18])
  @IsOptional()
  @Type(() => Number)
  itbisRate?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  discountPct?: number;
}
