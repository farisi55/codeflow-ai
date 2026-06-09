import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import type { Readable } from 'node:stream';

import type { ProviderMessage } from '../interfaces/provider.interface';
import { BaseProvider } from './base.provider';

@Injectable()
export class OpenRouterProvider extends BaseProvider {
  readonly id = 'openrouter';
  readonly name = 'OpenRouter';
  readonly models = [
    'auto',
    'anthropic/claude-3.5-sonnet',
    'deepseek/deepseek-coder',
    'openai/gpt-4o',
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

  protected getDefaultModel(): string {
    return (
      this.config.get<string>('providers.openrouter.defaultModel') ??
      'auto'
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
