import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import type { Readable } from 'node:stream';

import type { ProviderMessage } from '../interfaces/provider.interface';
import { BaseProvider } from './base.provider';

@Injectable()
export class SambaNovaProvider extends BaseProvider {
  readonly id = 'sambanova';
  readonly name = 'SambaNova';
  readonly models = [
    'Meta-Llama-3.3-70B-Instruct',
    'DeepSeek-V3.1',
    'MiniMax-M2.7',
    'gpt-oss-120b',
  ];

  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(private readonly config: ConfigService) {
    super();
    this.apiKey =
      this.config.get<string>('providers.sambanova.apiKey') ?? '';
    this.baseUrl =
      this.config.get<string>('providers.sambanova.baseUrl') ??
      'https://api.sambanova.ai/v1';
  }

  isAvailable(): boolean {
    return this.apiKey.length > 0;
  }

  getDefaultModel(): string {
    return (
      this.config.get<string>('providers.sambanova.defaultModel') ??
      'Meta-Llama-3.3-70B-Instruct'
    );
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

    const content = this.parseOpenAIStreamLine(buffer.trim());
    if (content) {
      yield content;
    }
  }
}
