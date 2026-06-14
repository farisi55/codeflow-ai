import { Injectable, Logger } from '@nestjs/common';
import type { ServerResponse } from 'node:http';

import { PromptOptimizerService } from '../prompt-optimizer/prompt-optimizer.service';
import { SkillsService } from '../skills/skills.service';
import { WebSearchService } from '../web-search/web-search.service';
import type { AIStreamDto } from './dto/ai-stream.dto';
import type {
  IProvider,
  ProviderCatalogEntry,
  ProviderModel,
  ProviderMessage,
} from './interfaces/provider.interface';
import { CloudflareProvider } from './providers/cloudflare.provider';
import { GeminiProvider } from './providers/gemini.provider';
import { GitHubModelsProvider } from './providers/github-models.provider';
import { GroqProvider } from './providers/groq.provider';
import { MistralProvider } from './providers/mistral.provider';
import { OllamaProvider } from './providers/ollama.provider';
import { OpenRouterProvider } from './providers/openrouter.provider';
import { SambaNovaProvider } from './providers/sambanova.provider';
import { ZaiProvider } from './providers/zai.provider';
import { FallbackService } from './routing/fallback.service';
import { TaskRouterService } from './routing/task-router.service';

const DEFAULT_SYSTEM_PROMPT = `You are an expert AI coding assistant integrated into CodeFlow AI, a web-based IDE.
Help developers write, review, refactor, and understand code.
Provide clear, concise, accurate responses.
When providing code, always use markdown code blocks with the language specified.
When the user explicitly asks to delete a project entry, include exactly "Delete file \`relative/path.ext\`" or "Delete folder \`relative/path\`" in the response so CodeFlow AI can request confirmation.
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

const CREATE_FILE_PROMPT = `The user requested creation of a new file.
- Return the complete contents of exactly one new file.
- Put the complete file in exactly one fenced markdown code block.
- Label the code block with the new file's language.
- Do not rewrite or return the active reference file.
- Do not provide alternatives, additional code blocks, or placeholders.
- You may add one short sentence outside the code block.
The code block can be created directly in the project, so it must contain only the final new file content.`;

const CREATE_MULTIPLE_FILES_PROMPT = `The user requested creation of multiple files.
- Return every requested file with its complete contents.
- Begin the multi-file section with \`\`\`files.
- Immediately before each code block, write FILE: relative/path.ext on its own line.
- Put each file in its own fenced markdown code block and label it with the language.
- End the multi-file section with a final \`\`\` line.
- For a browser app, use index.html, style.css, and script.js. The entry file is index.html.
- Do not omit files, use placeholders, or combine multiple files in one code block.
- Include the active reference file as a labeled file when it is part of the requested project changes.
CodeFlow AI parses each FILE: path.ext block separately. Never collapse multiple files into the active editor file.`;

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
    private readonly webSearch: WebSearchService,
    private readonly promptOptimizer: PromptOptimizerService,
    cloudflare: CloudflareProvider,
    github: GitHubModelsProvider,
    groq: GroqProvider,
    gemini: GeminiProvider,
    mistral: MistralProvider,
    openrouter: OpenRouterProvider,
    sambanova: SambaNovaProvider,
    zai: ZaiProvider,
    ollama: OllamaProvider,
  ) {
    this.providerMap = new Map<string, IProvider>([
      ['cloudflare', cloudflare],
      ['github', github],
      ['groq', groq],
      ['gemini', gemini],
      ['mistral', mistral],
      ['openrouter', openrouter],
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
      const webContext = await this.getWebContext(
        dto.content,
        dto.content,
        send,
      );
      let effectiveContent = dto.content;
      if (dto.promptOptimize) {
        const optimized = await this.promptOptimizer.optimize(
          {
            content: dto.content,
            activeFile: dto.activeFile,
            fileOperation: dto.fileOperation,
          },
          send,
          abortController.signal,
        );
        if (optimized) {
          effectiveContent = optimized.optimizedPrompt;
        }
      }

      const skill = this.skills.detectSkill(effectiveContent);
      const baseSystemPrompt = skill
        ? skill.getSystemPrompt(effectiveContent)
        : DEFAULT_SYSTEM_PROMPT;
      const isCreateOperation = dto.fileOperation?.type === 'create';
      const isMultiFileOperation =
        isCreateOperation && dto.fileOperation?.multiple === true;
      const operationPrompt = isMultiFileOperation
        ? CREATE_MULTIPLE_FILES_PROMPT
        : isCreateOperation
          ? CREATE_FILE_PROMPT
          : dto.activeFile
            ? ACTIVE_FILE_EDIT_PROMPT
            : '';
      const webPrompt = webContext
        ? [
            'Web browsing completed before generation and the results are included below.',
            'CRITICAL: use the web context for concrete CDN URLs, package names, imports, API methods, signatures, configuration, and versions.',
            'If the user requested official documentation only, do not introduce facts or links from unofficial sources.',
            'Cite relevant URLs from the web context.',
            '',
            webContext,
          ].join('\n')
        : '';
      const systemPrompt = [
        baseSystemPrompt,
        operationPrompt,
        webPrompt,
      ]
        .filter(Boolean)
        .join('\n\n');
      const userContent =
        dto.activeFile || isCreateOperation
          ? this.buildFileRequest(dto, effectiveContent)
          : effectiveContent;
      const messages: ProviderMessage[] = [
        { role: 'system', content: systemPrompt },
        ...dto.context.map((message) => ({
          role: message.role,
          content: message.content,
        })),
        { role: 'user', content: userContent },
      ];
      const providerOrder = this.taskRouter.getProviderOrder(
        effectiveContent,
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

  private async getWebContext(
    originalRequest: string,
    searchQuery: string,
    send: (chunk: object) => void,
  ): Promise<string> {
    const shouldBrowse =
      this.webSearch.shouldBrowse(originalRequest) ||
      this.webSearch.shouldBrowse(searchQuery);

    if (!shouldBrowse) {
      return '';
    }

    if (!this.webSearch.isAvailable()) {
      send({
        type: 'web_search',
        status: 'skipped',
        reason:
          'Web browsing requested but TAVILY_API_KEY and FIRECRAWL_API_KEY are not configured',
      });
      return '';
    }

    send({
      type: 'web_search',
      status: 'searching',
      query: searchQuery,
    });

    const result = await this.webSearch.search(
      searchQuery,
      undefined,
      this.webSearch.getSearchOptions(originalRequest),
    );
    if (!result) {
      send({
        type: 'web_search',
        status: 'failed',
        reason: 'All web search providers failed or returned no results',
      });
      return '';
    }

    send({
      type: 'web_search',
      status: 'done',
      provider: result.provider,
      results: result.results.map((item) => ({
        title: item.title,
        url: item.url,
      })),
    });

    return this.webSearch.formatForPrompt(result);
  }

  private buildFileRequest(
    dto: AIStreamDto,
    content: string,
  ): string {
    const activeFile = dto.activeFile;

    return [
      `User request: ${content}`,
      ...(dto.fileOperation?.type === 'create'
        ? [
            `Requested operation: ${
              dto.fileOperation.multiple
                ? 'create multiple files'
                : 'create new file'
            }`,
            ...(dto.fileOperation.multiple
              ? []
              : [
                  `Requested new file path: ${
                    dto.fileOperation.path ?? 'infer from request'
                  }`,
                ]),
          ]
        : []),
      ...(activeFile
        ? [
            '',
            `Active reference file path: ${activeFile.id}`,
            `Active reference file name: ${activeFile.name}`,
            `Active reference file language: ${activeFile.language}`,
            `Auto-Apply mode: ${dto.autoApply ? 'enabled' : 'disabled'}`,
            '',
            '--- BEGIN ACTIVE REFERENCE FILE CONTENT ---',
            activeFile.content,
            '--- END ACTIVE REFERENCE FILE CONTENT ---',
          ]
        : []),
    ].join('\n');
  }
}
