import type {
  AICompletionRequest,
  AICompletionResponse,
  AIProvider,
  AIStreamChunk,
} from '@codeflow/shared';

export interface IProvider {
  readonly name: AIProvider;
  complete(request: AICompletionRequest): Promise<AICompletionResponse>;
  stream(request: AICompletionRequest): AsyncIterable<AIStreamChunk>;
}
