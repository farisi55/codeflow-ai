import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import type { Readable } from 'node:stream';

import type { ProviderMessage } from '../interfaces/provider.interface';
import { BaseProvider } from './base.provider';

@Injectable()
export class CloudflareProvider extends BaseProvider {
  readonly id = 'cloudflare';
  readonly name = 'Cloudflare AI';
  readonly supportsDynamicModels = false;
  readonly models = [
    '@cf/meta/llama-3.1-8b-instruct',
    '@cf/meta/llama-3.1-70b-instruct',
    '@cf/mistral/mistral-7b-instruct-v0.2-lora',
    '@cf/qwen/qwen1.5-14b-chat-awq',
    '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b',
  ];

  private readonly apiKey: string;
  private readonly accountId: string;
  private readonly baseUrl: string;

  constructor(private readonly config: ConfigService) {
    super();
    this.apiKey =
      this.config.get<string>('providers.cloudflare.apiKey') ?? '';
    this.accountId =
      this.config.get<string>('providers.cloudflare.accountId') ?? '';
    this.baseUrl =
      this.config.get<string>('providers.cloudflare.baseUrl') ??
      'https://api.cloudflare.com/client/v4';
  }

  isAvailable(): boolean {
    return this.apiKey.length > 0 && this.accountId.length > 0;
  }

  getDefaultModel(): string {
    return (
      this.config.get<string>('providers.cloudflare.defaultModel') ??
      '@cf/meta/llama-3.1-8b-instruct'
    );
  }

  getFallbackModels(): string[] {
    return [...new Set([this.getDefaultModel(), ...this.models])].slice(
      0,
      4,
    );
  }

  async *stream(
    messages: ProviderMessage[],
    model: string,
    signal?: AbortSignal,
  ): AsyncGenerator<string, void, unknown> {
    const response = await axios.post<Readable>(
      `${this.baseUrl}/accounts/${this.accountId}/ai/v1/chat/completions`,
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
