import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import type { Readable } from 'node:stream';

import type {
  ProviderMessage,
  ProviderModel,
} from '../interfaces/provider.interface';
import { BaseProvider } from './base.provider';

interface GitHubModelsResponse {
  data?: Array<{
    id?: string;
    name?: string;
    publisher?: string;
    context_length?: number;
  }>;
}

@Injectable()
export class GitHubModelsProvider extends BaseProvider {
  readonly id = 'github';
  readonly name = 'GitHub Models';
  readonly supportsDynamicModels = true;
  readonly models = [
    'openai/gpt-4.1',
    'openai/gpt-4.1-mini',
    'openai/gpt-4o',
    'openai/gpt-4o-mini',
    'microsoft/phi-4',
    'meta/llama-3.3-70b-instruct',
    'mistral-ai/mistral-large-2411',
  ];

  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(private readonly config: ConfigService) {
    super();
    this.apiKey = this.config.get<string>('providers.github.apiKey') ?? '';
    this.baseUrl =
      this.config.get<string>('providers.github.baseUrl') ??
      'https://models.github.ai/inference';
  }

  isAvailable(): boolean {
    return this.apiKey.length > 0;
  }

  getDefaultModel(): string {
    return (
      this.config.get<string>('providers.github.defaultModel') ??
      'openai/gpt-4.1-mini'
    );
  }

  getFallbackModels(): string[] {
    return [...new Set([this.getDefaultModel(), ...this.models])].slice(
      0,
      5,
    );
  }

  async listModels(): Promise<ProviderModel[]> {
    const response = await axios.get<GitHubModelsResponse>(
      `${this.baseUrl}/models`,
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        timeout: 10000,
      },
    );

    return (response.data.data ?? [])
      .filter((model): model is typeof model & { id: string } => Boolean(model.id))
      .map((model) => ({
        id: model.id,
        name: model.name || model.id,
        contextLength: model.context_length,
        ownedBy: model.publisher,
      }))
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  async *stream(
    messages: ProviderMessage[],
    model: string,
    signal?: AbortSignal,
  ): AsyncGenerator<string, void, unknown> {
    const response = await axios.post<Readable>(
      `${this.baseUrl}/chat/completions`,
      {
        model: this.resolveModel(model),
        messages,
        stream: true,
      },
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        responseType: 'stream',
        signal,
      },
    );

    let buffer = '';
    for await (const chunk of response.data) {
      buffer += (chunk as Buffer).toString('utf-8');
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const content = this.parseOpenAIStreamLine(line.trim());
        if (content) {
          yield content;
        }
      }
    }
  }
}
