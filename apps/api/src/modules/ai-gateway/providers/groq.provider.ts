import type {
  AICompletionRequest,
  AICompletionResponse,
  AIStreamChunk,
} from '@codeflow/shared';

import { BaseProvider } from './base-provider';

export class GroqProvider extends BaseProvider {
  readonly name = 'groq' as const;

  complete(_request: AICompletionRequest): Promise<AICompletionResponse> {
    return Promise.reject(new Error('Groq provider is not implemented yet'));
  }

  async *stream(_request: AICompletionRequest): AsyncIterable<AIStreamChunk> {
    throw new Error('Groq provider streaming is not implemented yet');
  }
}
