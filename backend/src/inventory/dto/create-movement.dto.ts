import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsDateString,
  Min,
} from 'class-validator';
import { MovementType, MovementReason } from '../entities/inventory-movement.entity';

export class CreateMovementDto {
  @IsString()
  productId: string;

  @IsString()
  productName: string;

  @IsEnum(MovementType)
  type: MovementType;

  @IsEnum(MovementReason)
  @IsOptional()
  reason?: MovementReason;

  @IsNumber()
  @Min(0.01)
  quantity: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  unitCost?: number;

  @IsString()
  @IsOptional()
  reference?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsDateString()
  movementDate: string;
}
