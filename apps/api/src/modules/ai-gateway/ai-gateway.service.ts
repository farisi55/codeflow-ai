import type { AICompletionRequest } from '@codeflow/shared';
import { Injectable, NotImplementedException } from '@nestjs/common';

import type { AIRequestDto } from './dto/ai-request.dto';
import type { AIResponseDto } from './dto/ai-response.dto';

@Injectable()
export class AiGatewayService {
  complete(_request: AIRequestDto): Promise<AIResponseDto> {
    throw new NotImplementedException(
      'AI gateway orchestration is implemented in phase 02',
    );
  }

  stream(_request: AICompletionRequest): AsyncIterable<string> {
    throw new NotImplementedException(
      'AI gateway streaming is implemented in phase 02',
    );
  }
}
