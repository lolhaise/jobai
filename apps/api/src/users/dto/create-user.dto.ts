import { IsEmail, IsOptional, IsString, IsEnum, MinLength, IsBoolean } from 'class-validator';
import { UserRole } from '../../common/decorators/roles.decorator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsString()
  image?: string;
}