import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/**
 * DTO de création workspace.
 * Choix:
 * - Valider côté front uniquement : plus rapide, mais fragile.
 * - Valider côté API via DTO (class-validator) : standard NestJS.
 * Choix retenu : DTO côté API.
 */
export class CreateWorkspaceDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name!: string;
}
