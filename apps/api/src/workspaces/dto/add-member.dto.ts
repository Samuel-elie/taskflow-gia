import { IsEmail, IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { WorkspaceRole } from '@prisma/client';

/**
 * DTO ajout d'un membre à un workspace.
 * On ajoute un utilisateur par email (simple pour MVP).
 */
export class AddMemberDto {
  @IsEmail()
  email!: string;

  @IsEnum(WorkspaceRole)
  role!: WorkspaceRole;
}
