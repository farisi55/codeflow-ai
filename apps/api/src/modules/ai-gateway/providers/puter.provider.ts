import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import type { Readable } from 'node:stream';

import type { ProviderMessage } from '../interfaces/provider.interface';
import { BaseProvider } from './base.provider';

@Injectable()
export class PuterProvider extends BaseProvider {
  readonly id = 'puter';
  readonly name = 'Puter AI';
  readonly models = [
    'gpt-4o',
    'claude-3-5-sonnet',
    'gemini-2.0-flash',
  ];

  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(private readonly config: ConfigService) {
    super();
    this.apiKey = this.config.get<string>('providers.puter.apiKey') ?? '';
    this.baseUrl =
      this.config.get<string>('providers.puter.baseUrl') ??
      'https://api.puter.com';
  }

  isAvailable(): boolean {
    return this.apiKey.length > 0;
  }

  getDefaultModel(): string {
    return (
      this.config.get<string>('providers.puter.defaultModel') ?? 'gpt-4o'
    );
  }

  async *stream(
    messages: ProviderMessage[],
    model: string,
    signal?: AbortSignal,
  ): AsyncGenerator<string, void, unknown> {
    const response = await axios.post<Readable>(
      `${this.baseUrl}/v1/chat/completions`,
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
