import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateMeDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  name?: string | null;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;
}
