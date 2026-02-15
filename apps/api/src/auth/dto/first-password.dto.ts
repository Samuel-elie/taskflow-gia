import { IsString, MinLength } from 'class-validator';

export class FirstPasswordDto {
  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @MinLength(6)
  confirmPassword: string;
}
