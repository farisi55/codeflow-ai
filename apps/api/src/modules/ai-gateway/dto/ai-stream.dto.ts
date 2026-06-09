import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class ContextMessageDto {
  @IsIn(['user', 'assistant'])
  role!: 'user' | 'assistant';

  @IsString()
  content!: string;
}

export class AIStreamDto {
  @IsString()
  content!: string;

  @IsString()
  provider!: string;

  @IsString()
  model!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContextMessageDto)
  @IsOptional()
  context: ContextMessageDto[] = [];
}
