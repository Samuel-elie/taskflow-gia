import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class DesistTaskDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  reason: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  comment: string;
}
