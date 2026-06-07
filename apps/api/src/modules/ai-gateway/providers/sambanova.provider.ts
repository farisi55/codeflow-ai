import type {
  AICompletionRequest,
  AICompletionResponse,
  AIStreamChunk,
} from '@codeflow/shared';

import { BaseProvider } from './base-provider';

export class SambaNovaProvider extends BaseProvider {
  readonly name = 'sambanova' as const;

  complete(_request: AICompletionRequest): Promise<AICompletionResponse> {
    return Promise.reject(
      new Error('SambaNova provider is not implemented yet'),
    );
  }

  async *stream(_request: AICompletionRequest): AsyncIterable<AIStreamChunk> {
    throw new Error('SambaNova provider streaming is not implemented yet');
  }
}
