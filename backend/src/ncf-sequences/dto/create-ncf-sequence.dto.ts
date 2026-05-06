import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { NcfType } from '../../common/enums/ncf-type.enum';

export class CreateNcfSequenceDto {
  @IsEnum(NcfType)
  ncfType: NcfType;

  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  startSequence?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  endSequence?: number;
}
