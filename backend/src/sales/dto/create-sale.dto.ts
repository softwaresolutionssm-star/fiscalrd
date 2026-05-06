import { IsArray, IsDateString, IsEnum, IsIn, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { NcfType } from '../../common/enums/ncf-type.enum';
import { CreateSaleItemDto } from './create-sale-item.dto';

export class CreateSaleDto {
  @IsUUID()
  @IsOptional()
  customerId?: string;

  @IsString()
  @IsOptional()
  customerName?: string;

  @IsString()
  @IsOptional()
  customerRncCedula?: string;

  @IsEnum(NcfType)
  @IsOptional()
  ncfType?: NcfType;

  @IsDateString()
  @IsNotEmpty()
  saleDate: string;

  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsOptional()
  @IsArray()
  paymentSplits?: Array<{ method: string; amount: number }>;

  @IsIn(['DOP', 'USD'])
  @IsOptional()
  currency?: string; // DOP (default) | USD

  @IsNumber({ maxDecimalPlaces: 4 })
  @IsPositive()
  @IsOptional()
  exchangeRate?: number; // Tasa DOP/USD al momento de la venta (obligatorio si currency=USD)

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSaleItemDto)
  items: CreateSaleItemDto[];
}
