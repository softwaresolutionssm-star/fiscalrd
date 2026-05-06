import { IsString, IsOptional, IsArray, IsNumber, IsDateString } from 'class-validator';

export class CreateServiceOrderDto {
  @IsOptional() @IsString() customerId?: string;
  @IsString() customerName: string;
  @IsOptional() @IsString() customerPhone?: string;
  @IsOptional() vehicleInfo?: any;
  @IsString() problemDescription: string;
  @IsOptional() @IsString() internalNotes?: string;
  @IsOptional() @IsString() assignedEmployeeId?: string;
  @IsOptional() @IsString() assignedEmployeeName?: string;
  @IsOptional() @IsArray() items?: any[];
  @IsOptional() @IsNumber() laborCost?: number;
  @IsOptional() @IsDateString() estimatedDelivery?: string;
}

export class UpdateServiceOrderDto {
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() assignedEmployeeId?: string;
  @IsOptional() @IsString() assignedEmployeeName?: string;
  @IsOptional() internalNotes?: string;
  @IsOptional() vehicleInfo?: any;
  @IsOptional() @IsString() problemDescription?: string;
  @IsOptional() @IsArray() items?: any[];
  @IsOptional() @IsNumber() laborCost?: number;
  @IsOptional() @IsDateString() estimatedDelivery?: string;
  @IsOptional() @IsString() saleId?: string;
}
