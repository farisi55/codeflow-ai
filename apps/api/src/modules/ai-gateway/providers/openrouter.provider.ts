import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import type { Readable } from 'node:stream';

import type {
  ProviderMessage,
  ProviderModel,
} from '../interfaces/provider.interface';
import { BaseProvider } from './base.provider';

interface OpenRouterModelsResponse {
  data?: Array<{
    id?: string;
    name?: string;
    context_length?: number;
    architecture?: {
      input_modalities?: string[];
      output_modalities?: string[];
    };
    pricing?: {
      prompt?: string;
      completion?: string;
    };
  }>;
}

@Injectable()
export class OpenRouterProvider extends BaseProvider {
  readonly id = 'openrouter';
  readonly name = 'OpenRouter';
  readonly supportsDynamicModels = true;
  readonly models = [
    'openrouter/free',
    'openrouter/auto',
  ];

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly siteUrl: string;
  private readonly siteName: string;

  constructor(private readonly config: ConfigService) {
    super();
    this.apiKey =
      this.config.get<string>('providers.openrouter.apiKey') ?? '';
    this.baseUrl =
      this.config.get<string>('providers.openrouter.baseUrl') ??
      'https://openrouter.ai/api/v1';
    this.siteUrl =
      this.config.get<string>('providers.openrouter.siteUrl') ??
      'http://localhost:3000';
    this.siteName =
      this.config.get<string>('providers.openrouter.siteName') ??
      'CodeFlow AI';
  }

  isAvailable(): boolean {
    return this.apiKey.length > 0;
  }

  getDefaultModel(): string {
    return (
      this.config.get<string>('providers.openrouter.defaultModel') ??
      'openrouter/free'
    );
  }

  getFallbackModels(): string[] {
    return [
      ...new Set([
        this.getDefaultModel(),
        'openrouter/free',
        'openrouter/auto',
      ]),
    ];
  }

  async listModels(): Promise<ProviderModel[]> {
    const response = await axios.get<OpenRouterModelsResponse>(
      `${this.baseUrl}/models`,
      {
        headers: this.apiKey
          ? { Authorization: `Bearer ${this.apiKey}` }
          : undefined,
        timeout: 10000,
      },
    );

    return (response.data.data ?? [])
      .filter((model): model is typeof model & { id: string } => {
        if (!model.id) {
          return false;
        }
        const inputModalities = model.architecture?.input_modalities;
        const outputModalities = model.architecture?.output_modalities;
        return (
          (!inputModalities || inputModalities.includes('text')) &&
          (!outputModalities || outputModalities.includes('text'))
        );
      })
      .map((model) => {
        const promptPrice = Number(model.pricing?.prompt);
        const completionPrice = Number(model.pricing?.completion);
        const isFree =
          model.id.endsWith(':free') ||
          model.id === 'openrouter/free' ||
          (promptPrice === 0 && completionPrice === 0);

        return {
          id: model.id,
          name: model.name || model.id,
          isFree,
          contextLength: model.context_length,
        };
      })
      .sort((left, right) => {
        if (left.id === 'openrouter/free') {
          return -1;
        }
        if (right.id === 'openrouter/free') {
          return 1;
        }
        if (left.isFree !== right.isFree) {
          return left.isFree ? -1 : 1;
        }
        return left.name.localeCompare(right.name);
      });
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
          'HTTP-Referer': this.siteUrl,
          'X-Title': this.siteName,
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
