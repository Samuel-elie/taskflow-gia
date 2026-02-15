import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsEnum(['ADMIN', 'USER'] as const)
  global_role?: 'ADMIN' | 'USER';
}
