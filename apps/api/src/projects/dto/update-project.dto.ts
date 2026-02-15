import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * DTO update projet (PATCH).
 * Tous les champs sont optionnels.
 */
export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}
