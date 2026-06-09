import { Logger } from '@nestjs/common';

import type {
  IProvider,
  ProviderMessage,
} from '../interfaces/provider.interface';

export abstract class BaseProvider implements IProvider {
  protected readonly logger: Logger;

  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly models: string[];

  constructor() {
    this.logger = new Logger(this.constructor.name);
  }

  abstract isAvailable(): boolean;

  abstract stream(
    messages: ProviderMessage[],
    model: string,
    signal?: AbortSignal,
  ): AsyncGenerator<string, void, unknown>;

  protected resolveModel(model: string): string {
    return model && model !== 'auto' ? model : this.getDefaultModel();
  }

  protected abstract getDefaultModel(): string;

  protected parseOpenAIStreamLine(line: string): string | null {
    if (!line.startsWith('data: ')) {
      return null;
    }

    const payload = line.slice(6).trim();
    if (payload === '[DONE]') {
      return null;
    }

    try {
      const parsed = JSON.parse(payload) as {
        choices?: Array<{
          delta?: {
            content?: string;
          };
        }>;
      };
      return parsed.choices?.[0]?.delta?.content ?? null;
    } catch {
      return null;
    }
  }
}
