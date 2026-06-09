import { Injectable, Logger } from '@nestjs/common';
import type { ServerResponse } from 'node:http';

import { SkillsService } from '../skills/skills.service';
import type { AIStreamDto } from './dto/ai-stream.dto';
import type {
  IProvider,
  ProviderMessage,
} from './interfaces/provider.interface';
import { GeminiProvider } from './providers/gemini.provider';
import { GroqProvider } from './providers/groq.provider';
import { MistralProvider } from './providers/mistral.provider';
import { OllamaProvider } from './providers/ollama.provider';
import { OpenRouterProvider } from './providers/openrouter.provider';
import { PuterProvider } from './providers/puter.provider';
import { FallbackService } from './routing/fallback.service';
import { TaskRouterService } from './routing/task-router.service';

const DEFAULT_SYSTEM_PROMPT = `You are an expert AI coding assistant integrated into CodeFlow AI, a web-based IDE.
Help developers write, review, refactor, and understand code.
Provide clear, concise, accurate responses.
When providing code, always use markdown code blocks with the language specified.
Keep responses focused and practical.`;

@Injectable()
export class AIGatewayService {
  private readonly logger = new Logger(AIGatewayService.name);
  private readonly providerMap: Map<string, IProvider>;

  constructor(
    private readonly taskRouter: TaskRouterService,
    private readonly fallback: FallbackService,
    private readonly skills: SkillsService,
    groq: GroqProvider,
    gemini: GeminiProvider,
    mistral: MistralProvider,
    openrouter: OpenRouterProvider,
    puter: PuterProvider,
    ollama: OllamaProvider,
  ) {
    this.providerMap = new Map<string, IProvider>([
      ['groq', groq],
      ['gemini', gemini],
      ['mistral', mistral],
      ['openrouter', openrouter],
      ['puter', puter],
      ['ollama', ollama],
    ]);

    const available = [...this.providerMap.entries()]
      .filter(([, provider]) => provider.isAvailable())
      .map(([id]) => id);
    this.logger.log(`Available providers: [${available.join(', ')}]`);
  }

  async streamChat(
    dto: AIStreamDto,
    response: ServerResponse,
  ): Promise<void> {
    const send = (chunk: object): void => {
      if (!response.destroyed && !response.writableEnded) {
        response.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }
    };
    const abortController = new AbortController();
    response.once('close', () => abortController.abort());

    try {
      const skill = this.skills.detectSkill(dto.content);
      const systemPrompt = skill
        ? skill.getSystemPrompt(dto.content)
        : DEFAULT_SYSTEM_PROMPT;
      const messages: ProviderMessage[] = [
        { role: 'system', content: systemPrompt },
        ...dto.context.map((message) => ({
          role: message.role,
          content: message.content,
        })),
        { role: 'user', content: dto.content },
      ];
      const providerOrder = this.taskRouter.getProviderOrder(
        dto.content,
        dto.provider,
      );
      const { stream, providerId, modelId } =
        await this.fallback.execute(
          providerOrder,
          this.providerMap,
          messages,
          dto.model,
          abortController.signal,
        );

      for await (const token of stream) {
        if (abortController.signal.aborted) {
          return;
        }
        send({ type: 'chunk', content: token });
      }

      send({ type: 'done', provider: providerId, model: modelId });
    } catch (error) {
      if (!abortController.signal.aborted) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(`Stream failed: ${message}`);
        send({ type: 'error', error: message });
      }
    } finally {
      if (!response.writableEnded) {
        response.end();
      }
    }
  }

  getProviderStatuses(): Record<string, boolean> {
    const result: Record<string, boolean> = {};
    for (const [id, provider] of this.providerMap.entries()) {
      result[id] = provider.isAvailable();
    }
    return result;
  }
}
