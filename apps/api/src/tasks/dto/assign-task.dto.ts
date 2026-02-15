import { IsOptional, IsString } from 'class-validator';

/**
 * DTO assignation tâche.
 * assignee_id:
 * - string : assigner/réassigner
 * - null : désassigner
 */
export class AssignTaskDto {
  @IsOptional()
  @IsString()
  assignee_id?: string | null;
}
