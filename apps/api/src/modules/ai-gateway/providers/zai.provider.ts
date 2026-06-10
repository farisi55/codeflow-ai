import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import type { Readable } from 'node:stream';

import type { ProviderMessage } from '../interfaces/provider.interface';
import { BaseProvider } from './base.provider';

@Injectable()
export class ZaiProvider extends BaseProvider {
  readonly id = 'zai';
  readonly name = 'Z.AI';
  readonly models = [
    'glm-5.1',
    'glm-5',
    'glm-5-turbo',
    'glm-4.7',
    'glm-4.6',
    'glm-4.5',
    'glm-4-32B-0414-128K',
  ];

  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(private readonly config: ConfigService) {
    super();
    this.apiKey =
      this.config.get<string>('providers.zai.apiKey') ?? '';
    this.baseUrl =
      this.config.get<string>('providers.zai.baseUrl') ??
      'https://api.z.ai/api/paas/v4';
  }

  isAvailable(): boolean {
    return this.apiKey.length > 0;
  }

  getDefaultModel(): string {
    return (
      this.config.get<string>('providers.zai.defaultModel') ?? 'glm-5.1'
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
          'Accept-Language': 'en-US,en',
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
