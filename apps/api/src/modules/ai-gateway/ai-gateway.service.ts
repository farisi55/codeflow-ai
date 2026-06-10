import { Injectable, Logger } from '@nestjs/common';
import type { ServerResponse } from 'node:http';

import { SkillsService } from '../skills/skills.service';
import type { AIStreamDto } from './dto/ai-stream.dto';
import type {
  IProvider,
  ProviderCatalogEntry,
  ProviderModel,
  ProviderMessage,
} from './interfaces/provider.interface';
import { GeminiProvider } from './providers/gemini.provider';
import { GroqProvider } from './providers/groq.provider';
import { MistralProvider } from './providers/mistral.provider';
import { OllamaProvider } from './providers/ollama.provider';
import { OpenRouterProvider } from './providers/openrouter.provider';
import { PuterProvider } from './providers/puter.provider';
import { SambaNovaProvider } from './providers/sambanova.provider';
import { ZaiProvider } from './providers/zai.provider';
import { FallbackService } from './routing/fallback.service';
import { TaskRouterService } from './routing/task-router.service';

const DEFAULT_SYSTEM_PROMPT = `You are an expert AI coding assistant integrated into CodeFlow AI, a web-based IDE.
Help developers write, review, refactor, and understand code.
Provide clear, concise, accurate responses.
When providing code, always use markdown code blocks with the language specified.
Keep responses focused and practical.`;

const ACTIVE_FILE_EDIT_PROMPT = `An active editor file is included with the user's request.
When the user asks to change, fix, refactor, add, remove, or implement something in that file:
- Return the complete updated file, including all unchanged sections.
- Put the complete file in exactly one fenced markdown code block.
- Label the code block with the file's language.
- Do not provide alternative implementations or additional code blocks.
- Do not use placeholders such as "existing code" or omit unchanged code.
- You may add one short sentence outside the code block.
The code block can be applied directly to the user's file, so it must contain only the final file content.`;

const PROVIDER_CATALOG_TTL_MS = 5 * 60 * 1000;

@Injectable()
export class AIGatewayService {
  private readonly logger = new Logger(AIGatewayService.name);
  private readonly providerMap: Map<string, IProvider>;
  private providerCatalogCache:
    | {
        expiresAt: number;
        entries: ProviderCatalogEntry[];
      }
    | undefined;
  private providerCatalogRequest:
    | Promise<ProviderCatalogEntry[]>
    | undefined;

  constructor(
    private readonly taskRouter: TaskRouterService,
    private readonly fallback: FallbackService,
    private readonly skills: SkillsService,
    groq: GroqProvider,
    gemini: GeminiProvider,
    mistral: MistralProvider,
    openrouter: OpenRouterProvider,
    puter: PuterProvider,
    sambanova: SambaNovaProvider,
    zai: ZaiProvider,
    ollama: OllamaProvider,
  ) {
    this.providerMap = new Map<string, IProvider>([
      ['groq', groq],
      ['gemini', gemini],
      ['mistral', mistral],
      ['openrouter', openrouter],
      ['puter', puter],
      ['sambanova', sambanova],
      ['zai', zai],
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
      const baseSystemPrompt = skill
        ? skill.getSystemPrompt(dto.content)
        : DEFAULT_SYSTEM_PROMPT;
      const systemPrompt = dto.activeFile
        ? `${baseSystemPrompt}\n\n${ACTIVE_FILE_EDIT_PROMPT}`
        : baseSystemPrompt;
      const userContent = dto.activeFile
        ? this.buildActiveFileRequest(dto)
        : dto.content;
      const messages: ProviderMessage[] = [
        { role: 'system', content: systemPrompt },
        ...dto.context.map((message) => ({
          role: message.role,
          content: message.content,
        })),
        { role: 'user', content: userContent },
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
          dto.provider,
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

  async getProviderCatalog(
    forceRefresh = false,
  ): Promise<ProviderCatalogEntry[]> {
    const now = Date.now();
    if (
      !forceRefresh &&
      this.providerCatalogCache &&
      this.providerCatalogCache.expiresAt > now
    ) {
      return this.providerCatalogCache.entries;
    }

    if (!forceRefresh && this.providerCatalogRequest) {
      return this.providerCatalogRequest;
    }

    const request = this.loadProviderCatalog();
    this.providerCatalogRequest = request;

    try {
      const entries = await request;
      this.providerCatalogCache = {
        entries,
        expiresAt: Date.now() + PROVIDER_CATALOG_TTL_MS,
      };
      return entries;
    } finally {
      if (this.providerCatalogRequest === request) {
        this.providerCatalogRequest = undefined;
      }
    }
  }

  private async loadProviderCatalog(): Promise<ProviderCatalogEntry[]> {
    const updatedAt = new Date().toISOString();

    return Promise.all(
      [...this.providerMap.values()].map(async (provider) => {
        let source: ProviderCatalogEntry['source'] = 'fallback';
        let models = this.getStaticModels(provider);

        if (
          provider.supportsDynamicModels &&
          (provider.isAvailable() ||
            provider.id === 'openrouter' ||
            provider.id === 'ollama')
        ) {
          try {
            const liveModels = await provider.listModels();
            if (liveModels.length > 0) {
              source = 'live';
              models = liveModels;
            }
          } catch (error) {
            const message =
              error instanceof Error ? error.message : String(error);
            this.logger.warn(
              `Could not refresh ${provider.id} models; using fallback catalog: ${message}`,
            );
          }
        }

        return {
          id: provider.id,
          name: provider.name,
          available: provider.isAvailable(),
          isLocal: provider.id === 'ollama',
          defaultModel: provider.getDefaultModel(),
          source,
          models,
          updatedAt,
        };
      }),
    );
  }

  private getStaticModels(provider: IProvider): ProviderModel[] {
    return [...new Set([provider.getDefaultModel(), ...provider.models])].map(
      (id) => ({
        id,
        name: id,
        isFree:
          provider.id === 'openrouter' &&
          (id === 'openrouter/free' || id.endsWith(':free')),
      }),
    );
  }

  private buildActiveFileRequest(dto: AIStreamDto): string {
    const activeFile = dto.activeFile;
    if (!activeFile) {
      return dto.content;
    }

    return [
      `User request: ${dto.content}`,
      '',
      `Active file path: ${activeFile.id}`,
      `Active file name: ${activeFile.name}`,
      `Active file language: ${activeFile.language}`,
      `Auto-Apply mode: ${dto.autoApply ? 'enabled' : 'disabled'}`,
      '',
      '--- BEGIN ACTIVE FILE CONTENT ---',
      activeFile.content,
      '--- END ACTIVE FILE CONTENT ---',
    ].join('\n');
  }
}
