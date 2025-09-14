import { IsOptional, IsString, IsEnum, IsBoolean, IsEmail } from 'class-validator';
import { UserRole } from '../../common/decorators/roles.decorator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsString()
  image?: string;
}