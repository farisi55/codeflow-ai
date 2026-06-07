import { TaskType, type AIMessage, type AIProvider } from '@codeflow/shared';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class AIMessageDto implements AIMessage {
  @ApiProperty({ enum: ['system', 'user', 'assistant', 'tool'] })
  @IsIn(['system', 'user', 'assistant', 'tool'])
  role!: AIMessage['role'];

  @ApiProperty()
  @IsString()
  content!: string;
}

export class AIRequestDto {
  @ApiProperty({ type: [AIMessageDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AIMessageDto)
  messages!: AIMessageDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  provider?: AIProvider;

  @ApiPropertyOptional({ enum: TaskType })
  @IsOptional()
  @IsIn(Object.values(TaskType))
  taskType?: TaskType;
}
