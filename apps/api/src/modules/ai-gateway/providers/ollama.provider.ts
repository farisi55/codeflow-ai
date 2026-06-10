import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import type { Readable } from 'node:stream';

import type {
  ProviderMessage,
  ProviderModel,
} from '../interfaces/provider.interface';
import { BaseProvider } from './base.provider';

interface OllamaChunk {
  message?: {
    content?: string;
  };
  done?: boolean;
}

interface OllamaModelsResponse {
  models?: Array<{
    name?: string;
    model?: string;
  }>;
}

@Injectable()
export class OllamaProvider extends BaseProvider {
  readonly id = 'ollama';
  readonly name = 'Ollama (Local)';
  readonly supportsDynamicModels = true;
  readonly models = [
    'llama3.2',
    'qwen2.5-coder',
    'codellama',
    'deepseek-coder-v2',
  ];

  private readonly baseUrl: string;

  constructor(private readonly config: ConfigService) {
    super();
    this.baseUrl =
      this.config.get<string>('providers.ollama.baseUrl') ??
      'http://localhost:11434';
  }

  isAvailable(): boolean {
    return true;
  }

  getDefaultModel(): string {
    return (
      this.config.get<string>('providers.ollama.defaultModel') ??
      'llama3.2'
    );
  }

  async listModels(): Promise<ProviderModel[]> {
    const response = await axios.get<OllamaModelsResponse>(
      `${this.baseUrl}/api/tags`,
      { timeout: 3000 },
    );

    return (response.data.models ?? [])
      .map((model) => model.name || model.model || '')
      .filter((id) => id.length > 0)
      .map((id) => ({ id, name: id }));
  }

  async *stream(
    messages: ProviderMessage[],
    model: string,
    signal?: AbortSignal,
  ): AsyncGenerator<string, void, unknown> {
    const response = await axios.post<Readable>(
      `${this.baseUrl}/api/chat`,
      {
        model: this.resolveModel(model),
        messages: messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
        stream: true,
      },
      {
        responseType: 'stream',
        signal,
        timeout: 5000,
      },
    );

    let buffer = '';
    for await (const chunk of response.data) {
      buffer += (chunk as Buffer).toString('utf-8');
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.trim()) {
          continue;
        }

        try {
          const data = JSON.parse(line) as OllamaChunk;
          if (data.message?.content) {
            yield data.message.content;
          }
          if (data.done) {
            return;
          }
        } catch {
          this.logger.debug('Skipping malformed Ollama stream line');
        }
      }
    }
  }
}
