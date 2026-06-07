import type {
  AICompletionRequest,
  AICompletionResponse,
  AIStreamChunk,
} from '@codeflow/shared';

import { BaseProvider } from './base-provider';

export class ZaiProvider extends BaseProvider {
  readonly name = 'zai' as const;

  complete(_request: AICompletionRequest): Promise<AICompletionResponse> {
    return Promise.reject(new Error('Z.ai provider is not implemented yet'));
  }

  async *stream(_request: AICompletionRequest): AsyncIterable<AIStreamChunk> {
    throw new Error('Z.ai provider streaming is not implemented yet');
  }
}
