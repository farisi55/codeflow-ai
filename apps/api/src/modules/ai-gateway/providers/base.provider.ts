import { Logger } from '@nestjs/common';

import type {
  IProvider,
  ProviderModel,
  ProviderMessage,
} from '../interfaces/provider.interface';

export abstract class BaseProvider implements IProvider {
  protected readonly logger: Logger;

  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly models: string[];
  readonly supportsDynamicModels: boolean = false;

  constructor() {
    this.logger = new Logger(this.constructor.name);
  }

  abstract isAvailable(): boolean;

  abstract getDefaultModel(): string;

  getFallbackModels(): string[] {
    return [...new Set([this.getDefaultModel(), ...this.models])].slice(
      0,
      3,
    );
  }

  async listModels(): Promise<ProviderModel[]> {
    return this.models.map((id) => ({ id, name: id }));
  }

  abstract stream(
    messages: ProviderMessage[],
    model: string,
    signal?: AbortSignal,
  ): AsyncGenerator<string, void, unknown>;

  protected resolveModel(model: string): string {
    return model && model !== 'auto' ? model : this.getDefaultModel();
  }

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
