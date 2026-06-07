import type {
  AICompletionRequest,
  AICompletionResponse,
  AIStreamChunk,
} from '@codeflow/shared';

import { BaseProvider } from './base-provider';

export class OllamaProvider extends BaseProvider {
  readonly name = 'ollama' as const;

  complete(_request: AICompletionRequest): Promise<AICompletionResponse> {
    return Promise.reject(new Error('Ollama provider is not implemented yet'));
  }

  async *stream(_request: AICompletionRequest): AsyncIterable<AIStreamChunk> {
    throw new Error('Ollama provider streaming is not implemented yet');
  }
}
