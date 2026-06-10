import { GoogleGenerativeAI } from '@google/generative-ai';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { ProviderMessage } from '../interfaces/provider.interface';
import { BaseProvider } from './base.provider';

@Injectable()
export class GeminiProvider extends BaseProvider {
  readonly id = 'gemini';
  readonly name = 'Gemini';
  readonly models = [
    'gemini-2.0-flash',
    'gemini-1.5-pro',
    'gemini-1.5-flash',
  ];

  private readonly apiKey: string;

  constructor(private readonly config: ConfigService) {
    super();
    this.apiKey = this.config.get<string>('providers.gemini.apiKey') ?? '';
  }

  isAvailable(): boolean {
    return this.apiKey.length > 0;
  }

  getDefaultModel(): string {
    return (
      this.config.get<string>('providers.gemini.defaultModel') ??
      'gemini-2.0-flash'
    );
  }

  async *stream(
    messages: ProviderMessage[],
    model: string,
    signal?: AbortSignal,
  ): AsyncGenerator<string, void, unknown> {
    if (signal?.aborted) {
      throw new Error('Request aborted');
    }

    const generativeAI = new GoogleGenerativeAI(this.apiKey);
    const geminiModel = generativeAI.getGenerativeModel({
      model: this.resolveModel(model),
    });
    const systemMessage = messages.find(
      (message) => message.role === 'system',
    );
    const conversation = messages.filter(
      (message) => message.role !== 'system',
    );
    const result = await geminiModel.generateContentStream({
      systemInstruction: systemMessage?.content,
      contents: conversation.map((message) => ({
        role: message.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: message.content }],
      })),
    });

    for await (const chunk of result.stream) {
      if (signal?.aborted) {
        return;
      }
      const text = chunk.text();
      if (text) {
        yield text;
      }
    }
  }
}
