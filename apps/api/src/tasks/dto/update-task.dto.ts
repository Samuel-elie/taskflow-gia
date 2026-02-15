import { IsEnum, IsOptional, IsString, MaxLength, IsISO8601 } from 'class-validator';
import { TaskPriority, TaskStatus } from '@prisma/client';

/**
 * DTO update tâche (PATCH).
 * Tous les champs sont optionnels.
 */
export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsISO8601()
  deadline?: string;

  @IsOptional()
  @IsString()
  assignee_id?: string | null; // null = désassigner
}
