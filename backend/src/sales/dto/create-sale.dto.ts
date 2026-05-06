import { IsArray, IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
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

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSaleItemDto)
  items: CreateSaleItemDto[];
}
