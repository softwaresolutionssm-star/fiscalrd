import { IsString, IsNumber, IsDateString, IsOptional, Min } from 'class-validator';

export class CreateWithholdingDto {
  @IsString() type: string;
  @IsString() supplierName: string;
  @IsString() @IsOptional() supplierRnc?: string;
  @IsString() @IsOptional() supplierCedula?: string;
  @IsString() @IsOptional() ncfOriginal?: string;
  @IsDateString() withholdingDate: string;
  @IsNumber() @Min(0) baseAmount: number;
  @IsNumber() @Min(0) withholdingRate: number;
  @IsString() @IsOptional() notes?: string;
  @IsString() @IsOptional() period?: string;
}
