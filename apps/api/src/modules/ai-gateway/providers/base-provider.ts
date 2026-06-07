import type {
  AICompletionRequest,
  AICompletionResponse,
  AIProvider,
  AIStreamChunk,
} from '@codeflow/shared';

import type { IProvider } from '../interfaces/ai-provider.interface';

export abstract class BaseProvider implements IProvider {
  abstract readonly name: AIProvider;

  abstract complete(
    request: AICompletionRequest,
  ): Promise<AICompletionResponse>;

  abstract stream(request: AICompletionRequest): AsyncIterable<AIStreamChunk>;
}
