import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

/**
 * DTO UpdateWorkspace :
 * - name : renommer un workspace (optionnel)
 * - active : activer/désactiver (optionnel) via 0/1
 *
 * Choix : on accepte active en 0/1 car ton modèle Prisma utilise Int SmallInt.
 */
export class UpdateWorkspaceDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  active?: number; // 0 ou 1
}
