import { IsEnum, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { TaskStatus } from '@prisma/client';
import { Transform } from 'class-transformer';

/**
 * DTO query params pour lister les tâches d'un projet.
 * Important: class-transformer convertit les strings en numbers.
 */
export class ListTasksQueryDto {
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsString()
  assigneeId?: string;

  /**
   * overdue=1 pour filtrer les tâches en retard.
   * Choix:
   * - booléen true/false : parfois ambigu en query string.
   * - 0/1 : simple pour MVP.
   * Choix retenu : 0/1.
   */
  @IsOptional()
  @IsIn([0, 1])
  @Transform(({ value }) => Number(value))
  overdue?: 0 | 1;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
