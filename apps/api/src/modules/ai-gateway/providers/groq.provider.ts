import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import type { Readable } from 'node:stream';

import type {
  ProviderMessage,
  ProviderModel,
} from '../interfaces/provider.interface';
import { BaseProvider } from './base.provider';

interface GroqModelsResponse {
  data?: Array<{
    id?: string;
    owned_by?: string;
    active?: boolean;
    context_window?: number;
  }>;
}

const NON_CHAT_MODEL_PATTERN =
  /(whisper|speech|tts|orpheus|guard|moderation)/i;

@Injectable()
export class GroqProvider extends BaseProvider {
  readonly id = 'groq';
  readonly name = 'Groq';
  readonly supportsDynamicModels = true;
  readonly models = [
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant',
    'openai/gpt-oss-120b',
    'openai/gpt-oss-20b',
    'groq/compound',
    'groq/compound-mini',
  ];

  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(private readonly config: ConfigService) {
    super();
    this.apiKey = this.config.get<string>('providers.groq.apiKey') ?? '';
    this.baseUrl =
      this.config.get<string>('providers.groq.baseUrl') ??
      'https://api.groq.com/openai/v1';
  }

  isAvailable(): boolean {
    return this.apiKey.length > 0;
  }

  getDefaultModel(): string {
    return (
      this.config.get<string>('providers.groq.defaultModel') ??
      'llama-3.3-70b-versatile'
    );
  }

  async listModels(): Promise<ProviderModel[]> {
    const response = await axios.get<GroqModelsResponse>(
      `${this.baseUrl}/models`,
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        timeout: 8000,
      },
    );

    const defaultModel = this.getDefaultModel();
    return (response.data.data ?? [])
      .filter(
        (model): model is NonNullable<
          GroqModelsResponse['data']
        >[number] & { id: string } =>
          Boolean(model.id) &&
          model.active !== false &&
          !NON_CHAT_MODEL_PATTERN.test(model.id ?? ''),
      )
      .map((model) => ({
        id: model.id,
        name: model.id,
        contextLength: model.context_window,
        ownedBy: model.owned_by,
      }))
      .sort((left, right) => {
        if (left.id === defaultModel) {
          return -1;
        }
        if (right.id === defaultModel) {
          return 1;
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
