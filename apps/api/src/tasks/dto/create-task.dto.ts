import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength, IsISO8601 } from 'class-validator';
import { TaskPriority, TaskStatus } from '@prisma/client';

/**
 * DTO création tâche.
 * Remarque: deadline est ISO8601 string côté API pour simplicité,
 * puis convertie en Date dans le service.
 */
export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

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
  assignee_id?: string;
}
