import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  spawn,
  type ChildProcessByStdio,
} from 'child_process';
import {
  accessSync,
  constants,
  existsSync,
  mkdirSync,
} from 'fs';
import type { ServerResponse } from 'http';
import { tmpdir } from 'os';
import { delimiter, join } from 'path';
import type { Readable } from 'stream';

import { PromptOptimizerService } from '../prompt-optimizer/prompt-optimizer.service';
import { WebSearchService } from '../web-search/web-search.service';

export interface OpenFileContext {
  path: string;
  content: string;
  language: string;
}

export interface OpenCodeFileOperation {
  type: 'create';
  path?: string;
  multiple?: boolean;
}

export interface OpenCodeContextMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface OpenCodeChatParams {
  content: string;
  projectName: string;
  activeFile: OpenFileContext | null;
  openFiles: OpenFileContext[];
  filePaths: string[];
  fileOperation?: OpenCodeFileOperation;
  autoApply?: boolean;
  context?: OpenCodeContextMessage[];
  webContext?: string;
  promptOptimize?: boolean;
}

interface OpenCodeJsonEvent {
  type?: string;
  error?: unknown;
  part?: {
    type?: string;
    text?: string;
  };
}

interface ProcessResult {
  code: number | null;
  signal: NodeJS.Signals | null;
}

type OpenCodeProcess = ChildProcessByStdio<null, Readable, Readable>;

const DEFAULT_TIMEOUT_MS = 120_000;
const MAX_STDERR_CHARS = 8_000;
const IS_WINDOWS = process.platform === 'win32';

@Injectable()
export class OpenCodeService {
  private readonly logger = new Logger(OpenCodeService.name);
  private readonly timeoutMs: number;
  private readonly workingDirectory = join(
    tmpdir(),
    'codeflow-opencode-context',
  );

  constructor(
    private readonly config: ConfigService,
    private readonly webSearch: WebSearchService,
    private readonly promptOptimizer: PromptOptimizerService,
  ) {
    const configuredTimeout = Number.parseInt(
      this.config.get<string>('OPENCODE_TIMEOUT_MS') ?? '',
      10,
    );
    this.timeoutMs =
      Number.isFinite(configuredTimeout) && configuredTimeout > 0
        ? configuredTimeout
        : DEFAULT_TIMEOUT_MS;
  }

  async getHealth(): Promise<{
    installed: boolean;
    version?: string;
    error?: string;
  }> {
    const executable = this.resolveExecutable();
    if (!executable) {
      return {
        installed: false,
        error: 'OpenCode executable was not found',
      };
    }

    try {
      const { stdout, result } = await this.runCommand(
        executable,
        ['--version'],
        5_000,
      );
      if (result.code !== 0) {
        return {
          installed: false,
          error: `OpenCode exited with code ${result.code ?? 'unknown'}`,
        };
      }

      return {
        installed: true,
        version: stdout.trim() || undefined,
      };
    } catch (error) {
      return {
        installed: false,
        error: this.toErrorMessage(error),
      };
    }
  }

  buildPrompt(params: OpenCodeChatParams): string {
    const projectName = truncate(params.projectName.trim(), 200);
    const filePaths = params.filePaths
      .filter((path) => path.trim().length > 0)
      .slice(0, 100)
      .map((path) => truncate(path, 300))
      .join('\n');
    const activeFile = params.activeFile;
    const otherFiles = params.openFiles
      .filter((file) => file.path !== activeFile?.path)
      .slice(0, 4);
    const recentContext = (params.context ?? []).slice(-6);

    const sections = [
      [
        'You are a coding assistant integrated into CodeFlow AI.',
        'Use only the project context supplied below.',
        'Do not inspect or modify the local filesystem and do not run tools.',
        'Return proposed code changes as text; CodeFlow AI will apply them.',
        'For an explicit deletion request, include exactly "Delete file `relative/path.ext`" or "Delete folder `relative/path`" so CodeFlow AI can request confirmation.',
      ].join('\n'),
      projectName ? `Project: ${projectName}` : '',
      filePaths
        ? `Project structure (paths only):\n${truncate(filePaths, 2_500)}`
        : '',
      recentContext.length > 0
        ? [
            'Recent conversation:',
            ...recentContext.map(
              (message) =>
                `${message.role.toUpperCase()}:\n${truncate(
                  message.content,
                  450,
                )}`,
            ),
          ].join('\n\n')
        : '',
      params.webContext
        ? [
            'Web browsing results:',
            'Use these external results for current/latest/API documentation questions. Cite URLs when using facts from them.',
            params.webContext,
          ].join('\n')
        : '',
      activeFile
        ? formatFileContext(
            'Active file',
            activeFile,
            9_000,
          )
        : 'Active file: none',
      ...otherFiles.map((file) =>
        formatFileContext('Additional open file', file, 1_000),
      ),
      this.buildOutputContract(params),
      `User task:\n${truncate(params.content.trim(), 3_000)}`,
    ];

    return sections.filter(Boolean).join('\n\n');
  }

  async streamChat(
    params: OpenCodeChatParams,
    response: ServerResponse,
  ): Promise<void> {
    const executable = this.resolveExecutable();
    if (!executable) {
      this.send(response, {
        type: 'error',
        error:
          'OpenCode was not found. Install it with: npm install -g opencode-ai',
      });
      response.end();
      return;
    }

    mkdirSync(this.workingDirectory, { recursive: true });
    let effectiveContent = params.content;

    if (params.promptOptimize) {
      const optimizerAbort = new AbortController();
      const stopOptimizer = (): void => optimizerAbort.abort();
      response.once('close', stopOptimizer);

      try {
        const optimized = await this.promptOptimizer.optimize(
          {
            content: params.content,
            projectName: params.projectName,
            activeFile: params.activeFile,
            fileOperation: params.fileOperation,
            filePaths: params.filePaths,
          },
          (chunk) => this.send(response, chunk),
          optimizerAbort.signal,
        );
        if (optimized) {
          effectiveContent = optimized.optimizedPrompt;
        }
      } finally {
        response.off('close', stopOptimizer);
      }

      if (response.writableEnded || response.destroyed) {
        return;
      }
    }

    const webContext = await this.getWebContext(
      params.content,
      effectiveContent,
      response,
    );
    const prompt = this.buildPrompt({
      ...params,
      content: effectiveContent,
      webContext,
    });
    this.logger.log(
      `Running OpenCode with injected context for project "${params.projectName || 'untitled'}" (${prompt.length} characters)`,
    );

    let child: OpenCodeProcess | null = null;
    let timeout: NodeJS.Timeout | null = null;
    let timedOut = false;
    let aborted = false;
    let sentContent = false;
    let receivedError = false;
    let stderr = '';
    let lineBuffer = '';

    const stopChild = (): void => {
      aborted = true;
      if (child && child.exitCode === null) {
        child.kill();
      }
    };
    response.once('close', stopChild);

    try {
      const spawned = spawn(
        executable,
        [
          'run',
          '--pure',
          '--format',
          'json',
          '--dir',
          this.workingDirectory,
          '--',
          prompt,
        ],
        {
          cwd: this.workingDirectory,
          env: process.env,
          shell: false,
          stdio: ['ignore', 'pipe', 'pipe'],
          windowsHide: true,
        },
      );
      child = spawned;

      const resultPromise = waitForExit(spawned);
      timeout = setTimeout(() => {
        timedOut = true;
        if (child?.exitCode === null) {
          child.kill();
        }
      }, this.timeoutMs);

      spawned.stderr.on('data', (chunk: Buffer) => {
        if (stderr.length < MAX_STDERR_CHARS) {
          stderr += chunk.toString('utf8').slice(
            0,
            MAX_STDERR_CHARS - stderr.length,
          );
        }
      });

      for await (const chunk of spawned.stdout) {
        lineBuffer += (chunk as Buffer).toString('utf8');
        const lines = lineBuffer.split(/\r?\n/);
        lineBuffer = lines.pop() ?? '';

        for (const line of lines) {
          const output = this.processOutputLine(line, response);
          sentContent = output === 'content' || sentContent;
          receivedError = output === 'error' || receivedError;
        }
      }

      if (lineBuffer.trim()) {
        const output = this.processOutputLine(lineBuffer, response);
        sentContent = output === 'content' || sentContent;
        receivedError = output === 'error' || receivedError;
      }

      const result = await resultPromise;
      if (aborted || response.writableEnded) {
        return;
      }

      if (timedOut) {
        this.send(response, {
          type: 'error',
          error: 'OpenCode timed out. Try a smaller request.',
        });
        return;
      }

      if (receivedError) {
        return;
      }

      if (result.code !== 0) {
        const detail = stderr.trim();
        this.logger.warn(
          detail ||
            `OpenCode exited with code ${result.code ?? 'unknown'}${
              result.signal ? ` (${result.signal})` : ''
            }`,
        );
        this.send(response, {
          type: 'error',
          error:
            detail ||
            `OpenCode exited with code ${result.code ?? 'unknown'}`,
        });
        return;
      }

      if (!sentContent) {
        this.send(response, {
          type: 'error',
          error: 'OpenCode completed without returning a response.',
        });
        return;
      }

      this.send(response, {
        type: 'done',
        provider: 'opencode',
        model: 'auto',
      });
    } catch (error) {
      if (!aborted && !response.writableEnded) {
        const message = this.toErrorMessage(error);
        this.logger.error(message);
        this.send(response, {
          type: 'error',
          error: message,
        });
      }
    } finally {
      if (timeout) {
        clearTimeout(timeout);
      }
      response.off('close', stopChild);
      if (!response.writableEnded) {
        response.end();
      }
    }
  }

  private async getWebContext(
    originalRequest: string,
    searchQuery: string,
    response: ServerResponse,
  ): Promise<string> {
    const shouldBrowse =
      this.webSearch.shouldBrowse(originalRequest) ||
      this.webSearch.shouldBrowse(searchQuery);

    if (!shouldBrowse) {
      return '';
    }

    if (!this.webSearch.isAvailable()) {
      this.send(response, {
        type: 'web_search',
        status: 'skipped',
        reason:
          'Web browsing requested but TAVILY_API_KEY and FIRECRAWL_API_KEY are not configured',
      });
      return '';
    }

    this.send(response, {
      type: 'web_search',
      status: 'searching',
      query: searchQuery,
    });

    const result = await this.webSearch.search(searchQuery);
    if (!result) {
      this.send(response, {
        type: 'web_search',
        status: 'failed',
        reason: 'All web search providers failed or returned no results',
      });
      return '';
    }

    this.send(response, {
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

  private buildOutputContract(params: OpenCodeChatParams): string {
    if (
      params.fileOperation?.type === 'create' &&
      params.fileOperation.multiple
    ) {
      return [
        'Required output format:',
        'Return every requested file with its complete contents.',
        'Before each code block, write its relative path as a bold label, for example: **src/index.html**',
        'Use one fenced markdown code block per file and label each block with its language.',
        'Do not omit files, use placeholders, or combine files in one code block.',
        'Include the active reference file as a labeled file when it is part of the requested project changes.',
        'CodeFlow AI will create or update every labeled file.',
      ].join('\n');
    }

    if (params.fileOperation?.type === 'create') {
      return [
        'Required output format:',
        `Create a new file at: ${params.fileOperation.path ?? 'the path requested by the user'}.`,
        'Return exactly one fenced markdown code block containing the complete new file.',
        'Do not rewrite the active reference file.',
        'Do not return alternatives, additional code blocks, or placeholders.',
      ].join('\n');
    }

    if (params.activeFile) {
      return [
        'Required output format:',
        `Return the complete updated ${params.activeFile.path}, including unchanged sections.`,
        'Use exactly one fenced markdown code block.',
        'Do not return alternatives, additional code blocks, or placeholders.',
        `Auto-Apply is ${params.autoApply ? 'enabled' : 'disabled'}.`,
      ].join('\n');
    }

    return [
      'Required output format:',
      'Answer clearly and use fenced markdown code blocks for code.',
    ].join('\n');
  }

  private processOutputLine(
    line: string,
    response: ServerResponse,
  ): 'content' | 'error' | 'none' {
    const trimmed = line.trim();
    if (!trimmed) {
      return 'none';
    }

    try {
      const event = JSON.parse(trimmed) as OpenCodeJsonEvent;
      if (
        event.type === 'text' &&
        event.part?.type === 'text' &&
        event.part.text
      ) {
        this.send(response, {
          type: 'chunk',
          content: event.part.text,
        });
        return 'content';
      }

      if (event.type === 'error') {
        this.send(response, {
          type: 'error',
          error: formatUnknownError(event.error),
        });
        return 'error';
      }
      return 'none';
    } catch {
      this.send(response, {
        type: 'chunk',
        content: `${line}\n`,
      });
      return 'content';
    }
  }

  private send(
    response: ServerResponse,
    payload: Record<string, unknown>,
  ): void {
    if (!response.writableEnded && !response.destroyed) {
      response.write(`data: ${JSON.stringify(payload)}\n\n`);
    }
  }

  private resolveExecutable(): string | null {
    const configured = this.config
      .get<string>('OPENCODE_EXECUTABLE')
      ?.trim();
    if (configured) {
      return isExecutable(configured) ? configured : null;
    }

    const executableName = IS_WINDOWS ? 'opencode.exe' : 'opencode';
    const candidates = (process.env.PATH ?? '')
      .split(delimiter)
      .filter(Boolean)
      .flatMap((directory) => [
        join(directory, executableName),
        join(
          directory,
          'node_modules',
          'opencode-ai',
          'bin',
          executableName,
        ),
      ]);

    if (IS_WINDOWS && process.env.APPDATA) {
      candidates.unshift(
        join(
          process.env.APPDATA,
          'npm',
          'node_modules',
          'opencode-ai',
          'bin',
          executableName,
        ),
      );
    }

    return candidates.find(isExecutable) ?? null;
  }

  private runCommand(
    executable: string,
    args: string[],
    timeoutMs: number,
  ): Promise<{
    stdout: string;
    stderr: string;
    result: ProcessResult;
  }> {
    return new Promise((resolve, reject) => {
      const child = spawn(executable, args, {
        shell: false,
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      });
      let stdout = '';
      let stderr = '';
      const timer = setTimeout(() => {
        child.kill();
        reject(new Error('OpenCode health check timed out'));
      }, timeoutMs);

      child.stdout.on('data', (chunk: Buffer) => {
        stdout += chunk.toString('utf8');
      });
      child.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString('utf8');
      });
      child.once('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
      child.once('close', (code, signal) => {
        clearTimeout(timer);
        resolve({
          stdout,
          stderr,
          result: { code, signal },
        });
      });
    });
  }

  private toErrorMessage(error: unknown): string {
    const message =
      error instanceof Error ? error.message : String(error);
    return message.includes('ENOENT')
      ? 'OpenCode was not found. Install it with: npm install -g opencode-ai'
      : message;
  }
}

function formatFileContext(
  label: string,
  file: OpenFileContext,
  contentLimit: number,
): string {
  return [
    `${label}: ${truncate(file.path, 300)}`,
    `Language: ${truncate(file.language, 100)}`,
    '--- BEGIN FILE CONTENT ---',
    truncate(file.content, contentLimit),
    '--- END FILE CONTENT ---',
  ].join('\n');
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  const marker = '\n... [context truncated by CodeFlow AI] ...\n';
  const available = Math.max(0, maxLength - marker.length);
  const headLength = Math.ceil(available * 0.75);
  return `${value.slice(0, headLength)}${marker}${value.slice(
    -(available - headLength),
  )}`;
}

function isExecutable(filePath: string): boolean {
  if (!existsSync(filePath)) {
    return false;
  }

  try {
    accessSync(
      filePath,
      IS_WINDOWS ? constants.F_OK : constants.X_OK,
    );
    return true;
  } catch {
    return false;
  }
}

function waitForExit(
  child: OpenCodeProcess,
): Promise<ProcessResult> {
  return new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('close', (code, signal) => {
      resolve({ code, signal });
    });
  });
}

function formatUnknownError(error: unknown): string {
  if (typeof error === 'string') {
    return error;
  }
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return 'OpenCode returned an unknown error';
  }
}
