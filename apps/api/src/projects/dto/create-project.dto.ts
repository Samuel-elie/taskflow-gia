import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * DTO de création de projet.
 * Validation côté API pour éviter les données incohérentes en base.
 */
export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}
