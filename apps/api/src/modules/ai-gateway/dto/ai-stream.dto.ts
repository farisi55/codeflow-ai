import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
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

export class ActiveFileContextDto {
  @IsString()
  id!: string;

  @IsString()
  name!: string;

  @IsString()
  language!: string;

  @IsString()
  content!: string;
}

export class FileOperationDto {
  @IsIn(['create'])
  type!: 'create';

  @IsString()
  @IsOptional()
  path?: string;
}

export class AIStreamDto {
  @IsString()
  content!: string;

  @IsString()
  provider!: string;

  @IsString()
  model!: string;

  @ValidateNested()
  @Type(() => ActiveFileContextDto)
  @IsOptional()
  activeFile?: ActiveFileContextDto;

  @ValidateNested()
  @Type(() => FileOperationDto)
  @IsOptional()
  fileOperation?: FileOperationDto;

  @IsBoolean()
  @IsOptional()
  autoApply = false;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContextMessageDto)
  @IsOptional()
  context: ContextMessageDto[] = [];
}
