import { Transform } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { TaskStatus } from '@prisma/client';

/**
 * DTO query params pour GET /tasks/me
 * - status : TODO | DOING | DONE
 * - overdue : 0/1
 * - page/pageSize : pagination offset
 * - sort : deadline | creation_date
 * - order : asc | desc
 */
export class ListMyTasksQueryDto {
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

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

  /**
   * Choix:
   * - Autoriser n'importe quel champ -> risque de requêtes imprévues.
   * - Liste blanche des champs triables -> sécurité + stabilité.
   * Choix retenu : liste blanche.
   */
  @IsOptional()
  @IsIn(['deadline', 'creation_date'])
  sort?: 'deadline' | 'creation_date';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc';
}
