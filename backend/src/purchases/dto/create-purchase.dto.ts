import { IsString, IsArray, IsBoolean, IsDateString, IsNumber, IsOptional, IsUUID, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePurchaseItemDto {
  @IsUUID() @IsOptional() productId?: string;
  @IsString() description: string;
  @IsNumber() @Min(0) @Type(() => Number) quantity: number;
  @IsNumber() @Min(0) @Type(() => Number) unitCost: number;
  @IsNumber() @Min(0) @IsOptional() @Type(() => Number) itbisRate?: number;
}

export class CreatePurchaseDto {
  @IsUUID() @IsOptional() supplierId?: string;
  @IsString() @IsOptional() supplierName?: string;
  @IsString() @IsOptional() supplierRnc?: string;
  @IsString() @IsOptional() ncfNumber?: string;
  @IsString() @IsOptional() ncfType?: string;
  @IsDateString() purchaseDate: string;
  @IsBoolean() @IsOptional() isCredit?: boolean;
  @IsDateString() @IsOptional() dueDate?: string;
  @IsString() @IsOptional() notes?: string;
  @IsString() @IsOptional() documentUrl?: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => CreatePurchaseItemDto) items: CreatePurchaseItemDto[];
}
