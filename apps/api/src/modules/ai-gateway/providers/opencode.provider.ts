import type {
  AICompletionRequest,
  AICompletionResponse,
  AIStreamChunk,
} from '@codeflow/shared';

import { BaseProvider } from './base-provider';

export class OpenCodeProvider extends BaseProvider {
  readonly name = 'opencode' as const;

  complete(_request: AICompletionRequest): Promise<AICompletionResponse> {
    return Promise.reject(new Error('OpenCode provider is not implemented yet'));
  }

  async *stream(_request: AICompletionRequest): AsyncIterable<AIStreamChunk> {
    throw new Error('OpenCode provider streaming is not implemented yet');
  }
}
