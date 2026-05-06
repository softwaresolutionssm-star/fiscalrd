import { IsBoolean, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  barcode?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Type(() => Number)
  price: number;

  @IsIn([0, 16, 18], { message: 'ITBIS debe ser 0%, 16% o 18%' })
  @IsOptional()
  @Type(() => Number)
  itbisRate?: number;

  @IsBoolean()
  @IsOptional()
  isService?: boolean;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  minStock?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  costPrice?: number | null;

  @IsString()
  @IsOptional()
  supplierId?: string;
}
