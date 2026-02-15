import { IsEnum } from 'class-validator';

export class UpdateMemberRoleDto {
  @IsEnum(['OWNER', 'MANAGER', 'MEMBER'] as const)
  role: 'OWNER' | 'MANAGER' | 'MEMBER';
}
