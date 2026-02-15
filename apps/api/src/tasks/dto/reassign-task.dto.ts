// src/tasks/dto/reassign-task.dto.ts
import { IsNotEmpty, IsString } from 'class-validator';

export class ReassignTaskDto {
  @IsString()
  @IsNotEmpty()
  assignee_id: string;
}
