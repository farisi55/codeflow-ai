import { Injectable, Logger } from '@nestjs/common';

import type {
  IProvider,
  ProviderMessage,
} from '../ai-gateway/interfaces/provider.interface';
import { GeminiProvider } from '../ai-gateway/providers/gemini.provider';
import { GroqProvider } from '../ai-gateway/providers/groq.provider';
import { MistralProvider } from '../ai-gateway/providers/mistral.provider';
import { OllamaProvider } from '../ai-gateway/providers/ollama.provider';
import { OpenRouterProvider } from '../ai-gateway/providers/openrouter.provider';
import { SambaNovaProvider } from '../ai-gateway/providers/sambanova.provider';
import { ZaiProvider } from '../ai-gateway/providers/zai.provider';
import { FallbackService } from '../ai-gateway/routing/fallback.service';

export interface OptimizerFileContext {
  id?: string;
  path?: string;
  name?: string;
  language: string;
  content: string;
}

export interface OptimizerFileOperation {
  type: 'create';
  path?: string;
  multiple?: boolean;
}

export interface PromptOptimizeParams {
  content: string;
  projectName?: string;
  activeFile?: OptimizerFileContext | null;
  fileOperation?: OptimizerFileOperation;
  filePaths?: string[];
}

export interface PromptOptimizeResult {
  optimizedPrompt: string;
  analysis: string;
  providerId: string;
  modelId: string;
}

export type OptimizeStatusSender = (
  chunk: Record<string, unknown>,
) => void;

const MIN_OPTIMIZE_LENGTH = 12;
const QUICK_PROVIDER_ORDER = [
  'groq',
  'sambanova',
  'gemini',
  'zai',
  'mistral',
  'openrouter',
  'ollama',
];

const STAGE1_SYSTEM_PROMPT = `You are a senior fullstack engineer with deep expertise in backend architecture, API design, and UI/UX.
Analyze the user's request together with the provided code/project context and produce a short technical breakdown.

Structure your answer with these sections:
1. Goal - one sentence restating what the user wants
2. Affected files/areas - which files, components, or modules are involved
3. Technical approach - concrete implementation plan (data flow, functions, components, API contracts)
4. UI/UX considerations - layout, states (loading/empty/error), accessibility, responsiveness (skip if purely backend)
5. Edge cases & risks - what to handle or watch out for

Be specific and concise (aim for under 200 words). Do not write final code. Plain text/markdown only, no fenced code blocks.`;

const STAGE2_SYSTEM_PROMPT = `You are a senior prompt engineer who writes precise instructions for AI coding agents.
Rewrite the technical breakdown into a single, optimized prompt that will be sent directly to an AI coding model.

Requirements:
- State exactly what to build or change, and where (file paths if known)
- Preserve every technical decision from the breakdown - do not lose detail
- Remove filler, meta-commentary, and repetition
- Be concise but complete
- Do not add instructions about output formatting or code block rules - that is handled separately
- Write in the same language as the original user request

Output ONLY the rewritten prompt text. No preamble, no headings, no markdown formatting, no quotes around it.`;

@Injectable()
export class PromptOptimizerService {
  private readonly logger = new Logger(PromptOptimizerService.name);
  private readonly providerMap: Map<string, IProvider>;

  constructor(
    private readonly fallback: FallbackService,
    groq: GroqProvider,
    gemini: GeminiProvider,
    mistral: MistralProvider,
    openrouter: OpenRouterProvider,
    sambanova: SambaNovaProvider,
    zai: ZaiProvider,
    ollama: OllamaProvider,
  ) {
    this.providerMap = new Map<string, IProvider>([
      ['groq', groq],
      ['gemini', gemini],
      ['mistral', mistral],
      ['openrouter', openrouter],
      ['sambanova', sambanova],
      ['zai', zai],
      ['ollama', ollama],
    ]);
  }

  async optimize(
    params: PromptOptimizeParams,
    send: OptimizeStatusSender,
    signal?: AbortSignal,
  ): Promise<PromptOptimizeResult | null> {
    if (params.content.trim().length < MIN_OPTIMIZE_LENGTH) {
      return null;
    }

    send({
      type: 'prompt_optimize',
      stage: 'analysis',
      status: 'running',
    });

    let analysis: string;
    let providerId = '';
    let modelId = '';

    try {
      const result = await this.runStage(
        STAGE1_SYSTEM_PROMPT,
        this.buildStage1UserPrompt(params),
        signal,
      );
      analysis = result.text;
      providerId = result.providerId;
      modelId = result.modelId;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);
      this.logger.warn(`Prompt optimizer stage 1 failed: ${message}`);
      send({
        type: 'prompt_optimize',
        stage: 'analysis',
        status: 'failed',
        reason: message,
      });
      return null;
    }

    send({
      type: 'prompt_optimize',
      stage: 'analysis',
      status: 'done',
      preview: truncate(analysis, 600),
      provider: providerId,
      model: modelId,
    });
    send({
      type: 'prompt_optimize',
      stage: 'engineering',
      status: 'running',
    });

    let optimizedPrompt: string;
    try {
      const result = await this.runStage(
        STAGE2_SYSTEM_PROMPT,
        this.buildStage2UserPrompt(params, analysis),
        signal,
      );
      optimizedPrompt = result.text;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);
      this.logger.warn(`Prompt optimizer stage 2 failed: ${message}`);
      send({
        type: 'prompt_optimize',
        stage: 'engineering',
        status: 'failed',
        reason: message,
      });
      return {
        optimizedPrompt: `${params.content}\n\n${analysis}`,
        analysis,
        providerId,
        modelId,
      };
    }

    send({
      type: 'prompt_optimize',
      stage: 'engineering',
      status: 'done',
      optimizedPrompt: truncate(optimizedPrompt, 800),
    });

    return { optimizedPrompt, analysis, providerId, modelId };
  }

  private async runStage(
    systemPrompt: string,
    userPrompt: string,
    signal?: AbortSignal,
  ): Promise<{
    text: string;
    providerId: string;
    modelId: string;
  }> {
    const messages: ProviderMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];
    const { stream, providerId, modelId } =
      await this.fallback.execute(
        QUICK_PROVIDER_ORDER,
        this.providerMap,
        messages,
        'auto',
        'auto',
        signal,
      );

    let text = '';
    for await (const token of stream) {
      if (signal?.aborted) {
        throw new Error('Request aborted');
      }
      text += token;
    }

    const trimmedText = text.trim();
    if (!trimmedText) {
      throw new Error('Prompt optimizer returned an empty response');
    }

    return { text: trimmedText, providerId, modelId };
  }

  private buildStage1UserPrompt(
    params: PromptOptimizeParams,
  ): string {
    const sections = [`User request: ${params.content.trim()}`];

    if (params.projectName) {
      sections.push(`Project: ${params.projectName}`);
    }

    if (params.fileOperation?.type === 'create') {
      sections.push(
        params.fileOperation.multiple
          ? 'Requested operation: create multiple files'
          : `Requested operation: create new file${
              params.fileOperation.path
                ? ` at ${params.fileOperation.path}`
                : ''
            }`,
      );
    }

    if (params.filePaths && params.filePaths.length > 0) {
      sections.push(
        `Project structure (paths only):\n${truncate(
          params.filePaths.slice(0, 60).join('\n'),
          1_500,
        )}`,
      );
    }

    if (params.activeFile) {
      const activeFile = params.activeFile;
      sections.push(
        [
          `Active file: ${
            activeFile.path ??
            activeFile.id ??
            activeFile.name ??
            'unknown'
          }`,
          `Language: ${activeFile.language}`,
          '--- BEGIN FILE CONTENT ---',
          truncate(activeFile.content, 4_000),
          '--- END FILE CONTENT ---',
        ].join('\n'),
      );
    }

    return sections.join('\n\n');
  }

  private buildStage2UserPrompt(
    params: PromptOptimizeParams,
    analysis: string,
  ): string {
    return [
      `Original user request: ${params.content.trim()}`,
      `Technical breakdown:\n${analysis}`,
      'Rewrite this into a single optimized prompt for the code-generation AI, as instructed.',
    ].join('\n\n');
  }
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength)}...`;
}
