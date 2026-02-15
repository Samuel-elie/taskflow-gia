import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/**
 * DTO création commentaire.
 */
export class CreateCommentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content!: string;
}
