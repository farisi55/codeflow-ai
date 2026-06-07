import type { AIProvider } from '@codeflow/shared';
import { ApiProperty } from '@nestjs/swagger';

export class AIResponseDto {
  @ApiProperty()
  content!: string;

  @ApiProperty()
  model!: string;

  @ApiProperty()
  provider!: AIProvider;
}
