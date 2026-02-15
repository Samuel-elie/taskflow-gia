import { IsEmail, IsEnum } from 'class-validator';

export class AddMemberDto {
  @IsEmail()
  email: string;

  @IsEnum(['OWNER', 'MANAGER', 'MEMBER'] as const)
  role: 'OWNER' | 'MANAGER' | 'MEMBER';
}
