import { IsEmail, IsEnum } from 'class-validator';

export class CreateInviteDto {
  @IsEmail()
  email: string;

  @IsEnum(['OWNER', 'MANAGER', 'MEMBER'] as const)
  role: 'OWNER' | 'MANAGER' | 'MEMBER';
}
