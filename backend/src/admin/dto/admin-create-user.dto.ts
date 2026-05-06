import { IsString, IsEmail, IsEnum, MinLength } from 'class-validator';
import { UserRole } from '../../common/enums/roles.enum';

export class AdminCreateUserDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsEnum(UserRole)
  role: UserRole;
}
