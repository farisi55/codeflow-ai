import type {
  AICompletionRequest,
  AICompletionResponse,
  AIStreamChunk,
} from '@codeflow/shared';

import { BaseProvider } from './base-provider';

export class OpenRouterProvider extends BaseProvider {
  readonly name = 'openrouter' as const;

  complete(_request: AICompletionRequest): Promise<AICompletionResponse> {
    return Promise.reject(new Error('OpenRouter provider is not implemented yet'));
  }

  async *stream(_request: AICompletionRequest): AsyncIterable<AIStreamChunk> {
    throw new Error('OpenRouter provider streaming is not implemented yet');
  }
}
