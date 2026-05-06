import { IsString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { AccountType } from '../entities/account.entity';

export class CreateAccountDto {
  @IsString()
  code: string;

  @IsString()
  name: string;

  @IsEnum(AccountType)
  type: AccountType;

  @IsUUID()
  @IsOptional()
  parentId?: string;
}
