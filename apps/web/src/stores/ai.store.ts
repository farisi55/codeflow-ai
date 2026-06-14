import { create } from 'zustand';

import { apiClient, parseSSELine } from '@/lib/api-client';
import type { FileNode } from '@/mock/file-tree';
import { MOCK_AI_RESPONSES } from '@/mock/ai-responses';
import { useEditorStore } from '@/stores/editor.store';
import { useExplorerStore } from '@/stores/explorer.store';
import { useSettingsStore } from '@/stores/settings.store';
import type {
  AIActiveFileContext,
  AIFileOperation,
  AIStreamChunk,
  OpenCodeFileContext,
  ProviderCatalogEntry,
} from '@/types/api.types';

export interface SendMessageOptions {
  activeFile?: AIActiveFileContext;
  fileOperation?: AIFileOperation;
  autoApply?: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  resolvedProvider?: string;
  resolvedModel?: string;
  autoApplyRequested?: boolean;
  targetFile?: AIActiveFileContext;
  fileOperation?: AIFileOperation;
  isMockResponse?: boolean;
}

export type BackendStatus = 'checking' | 'connected' | 'offline';

interface AIState {
  messages: ChatMessage[];
  isLoading: boolean;
  backendStatus: BackendStatus;
  selectedProvider: string;
  selectedModel: string;
  providerCatalog: ProviderCatalogEntry[];
  isCatalogLoading: boolean;
  mockResponseIndex: number;
  sendMessage: (
    content: string,
    options?: SendMessageOptions,
  ) => Promise<void>;
  checkBackend: () => Promise<void>;
  refreshProviderCatalog: (forceRefresh?: boolean) => Promise<void>;
  setProvider: (provider: string) => void;
  setModel: (model: string) => void;
  clearMessages: () => void;
}

let activeOperationId: string | null = null;
let activeMockInterval: number | null = null;
let resolveMockStream: (() => void) | null = null;

function stopMockStream(): void {
  if (activeMockInterval !== null) {
    window.clearInterval(activeMockInterval);
    activeMockInterval = null;
  }
  resolveMockStream?.();
  resolveMockStream = null;
}

function formatWebSearchStatus(chunk: AIStreamChunk): string {
  if (chunk.type !== 'web_search') {
    return '';
  }

  if (chunk.status === 'searching') {
    return `🔎 Browsing the web for: ${chunk.query ?? 'current request'}`;
  }

  if (chunk.status === 'done') {
    const links = (chunk.results ?? [])
      .slice(0, 3)
      .map((item) => `- [${item.title}](${item.url})`)
      .join('\n');
    return [
      `✅ Web browsing completed via ${chunk.provider ?? 'provider'}.`,
      links,
    ]
      .filter(Boolean)
      .join('\n');
  }

  if (chunk.status === 'skipped') {
    return `⚠️ Web browsing skipped: ${chunk.reason ?? 'not configured'}`;
  }

  if (chunk.status === 'failed') {
    return `⚠️ Web browsing failed: ${chunk.reason ?? 'all providers failed'}`;
  }

  return '';
}

function sanitizeForChat(text: string): string {
  return text.split('```').join('`\u200b``');
}

function formatPromptOptimizeStatus(
  chunk: AIStreamChunk,
): string {
  if (chunk.type !== 'prompt_optimize') {
    return '';
  }

  if (chunk.stage === 'analysis') {
    if (chunk.status === 'running') {
      return 'Analyzing requirements (fullstack, backend, UI/UX)...';
    }
    if (chunk.status === 'failed') {
      return `Prompt analysis skipped: ${
        chunk.reason ?? 'unknown error'
      }`;
    }
    return '';
  }

  if (chunk.stage === 'engineering') {
    if (chunk.status === 'running') {
      return 'Optimizing prompt for code generation...';
    }
    if (chunk.status === 'failed') {
      return `Prompt rewrite skipped: ${
        chunk.reason ?? 'unknown error'
      }`;
    }
    if (chunk.status === 'done' && chunk.optimizedPrompt) {
      const quoted = sanitizeForChat(chunk.optimizedPrompt)
        .split('\n')
        .map((line) => `> ${line}`)
        .join('\n');
      return ['Prompt optimized:', quoted].join('\n');
    }
    return 'Prompt optimized';
  }

  return '';
}

export const useAIStore = create<AIState>((set, get) => ({
  messages: [],
  isLoading: false,
  backendStatus: 'checking',
  selectedProvider: 'auto',
  selectedModel: 'Auto',
  providerCatalog: [],
  isCatalogLoading: false,
  mockResponseIndex: 0,

  checkBackend: async () => {
    set((state) => ({
      ...state,
      backendStatus: 'checking',
    }));
    const isConnected = await apiClient.checkHealth();
    set((state) => ({
      ...state,
      backendStatus: isConnected ? 'connected' : 'offline',
    }));
    if (isConnected) {
      await get().refreshProviderCatalog();
    }
  },

  refreshProviderCatalog: async (forceRefresh = false) => {
    set({ isCatalogLoading: true });
    const providerCatalog =
      await apiClient.getProviderCatalog(forceRefresh);
    set((state) => ({
      providerCatalog: providerCatalog ?? state.providerCatalog,
      isCatalogLoading: false,
    }));
  },

  sendMessage: async (content, options = {}) => {
    const trimmedContent = content.trim();
    const initialState = get();
    if (!trimmedContent || initialState.isLoading) {
      return;
    }

    const baseId = Date.now().toString();
    const userMessage: ChatMessage = {
      id: `${baseId}-user`,
      role: 'user',
      content: trimmedContent,
      timestamp: new Date(),
    };
    const assistantMessage: ChatMessage = {
      id: `${baseId}-assistant`,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
      autoApplyRequested: options.autoApply === true,
      targetFile: options.activeFile,
      fileOperation: options.fileOperation,
    };
    const operationId = assistantMessage.id;
    const context = initialState.messages.slice(-6).map((message) => ({
      role: message.role,
      content: message.content,
    }));
    const selectedProvider = initialState.selectedProvider;
    const selectedModel = initialState.selectedModel;
    const openCodeEnabled =
      useSettingsStore.getState().openCodeEnabled;
    const promptOptimizeEnabled =
      useSettingsStore.getState().promptOptimizeEnabled;
    activeOperationId = operationId;

    set((state) => ({
      ...state,
      messages: [...state.messages, userMessage, assistantMessage],
      isLoading: true,
    }));

    let stream: ReadableStream<Uint8Array> | null;
    if (openCodeEnabled) {
      const editorState = useEditorStore.getState();
      const explorerState = useExplorerStore.getState();
      const currentActiveFile =
        editorState.openFiles.find(
          (file) => file.id === editorState.activeFileId,
        ) ?? null;
      const activeSnapshot = options.activeFile ?? currentActiveFile;
      const activeFile: OpenCodeFileContext | null = activeSnapshot
        ? {
            path: activeSnapshot.id,
            content: activeSnapshot.content,
            language: activeSnapshot.language,
          }
        : null;
      const openFiles = buildOpenFileContext(
        activeFile,
        editorState.openFiles,
      );

      stream = await apiClient.streamOpenCode({
        content: trimmedContent,
        projectName: explorerState.projectName ?? '',
        activeFile,
        openFiles,
        filePaths: flattenFileTree(explorerState.fileTree),
        fileOperation: options.fileOperation,
        autoApply: options.autoApply,
        promptOptimize: promptOptimizeEnabled,
        context,
      });
    } else {
      const backendProvider =
        selectedProvider === 'puter' ? 'auto' : selectedProvider;
      stream = await apiClient.streamChat({
        content: trimmedContent,
        provider: backendProvider,
        model:
          backendProvider === 'auto' || selectedModel === 'Auto'
            ? 'auto'
            : selectedModel,
        activeFile: options.activeFile,
        fileOperation: options.fileOperation,
        autoApply: options.autoApply,
        promptOptimize: promptOptimizeEnabled,
        context,
      });
    }

    if (activeOperationId !== operationId) {
      return;
    }

    let shouldUseMock = stream === null;

    if (stream) {
      set((state) => ({
        ...state,
        backendStatus: 'connected',
      }));

      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let bufferedText = '';
      let receivedContent = false;
      let hasActivityStatus = false;

      try {
        streamLoop: while (true) {
          const { value, done } = await reader.read();
          if (activeOperationId !== operationId) {
            await reader.cancel();
            return;
          }

          bufferedText += decoder.decode(value, { stream: !done });
          const lines = bufferedText.split(/\r?\n/);
          bufferedText = done ? '' : (lines.pop() ?? '');

          for (const line of lines) {
            const chunk: AIStreamChunk | null = parseSSELine(line);
            if (!chunk) {
              continue;
            }

            if (chunk.type === 'chunk' && chunk.content) {
              const separator =
                !receivedContent && hasActivityStatus ? '\n\n' : '';
              receivedContent = true;
              set((state) => ({
                ...state,
                messages: state.messages.map((message) =>
                  message.id === assistantMessage.id
                    ? {
                        ...message,
                        content:
                          message.content + separator + chunk.content,
                      }
                    : message,
                ),
              }));
              continue;
            }

            if (chunk.type === 'prompt_optimize') {
              const statusText =
                formatPromptOptimizeStatus(chunk);
              if (statusText) {
                hasActivityStatus = true;
                set((state) => ({
                  ...state,
                  messages: state.messages.map((message) =>
                    message.id === assistantMessage.id
                      ? {
                          ...message,
                          content:
                            message.content.length > 0
                              ? `${message.content}\n\n${statusText}`
                              : statusText,
                        }
                      : message,
                  ),
                }));
              }
              continue;
            }

            if (chunk.type === 'web_search') {
              const statusText = formatWebSearchStatus(chunk);
              if (statusText) {
                hasActivityStatus = true;
                set((state) => ({
                  ...state,
                  messages: state.messages.map((message) =>
                    message.id === assistantMessage.id
                      ? {
                          ...message,
                          content:
                            message.content.length > 0
                              ? `${message.content}\n\n${statusText}`
                              : statusText,
                        }
                      : message,
                  ),
                }));
              }
              continue;
            }

            if (chunk.type === 'done') {
              activeOperationId = null;
              set((state) => ({
                ...state,
                messages: state.messages.map((message) =>
                  message.id === assistantMessage.id
                    ? {
                        ...message,
                        isStreaming: false,
                        resolvedProvider: chunk.provider,
                        resolvedModel: chunk.model,
                      }
                    : message,
                ),
                isLoading: false,
              }));
              return;
            }

            if (chunk.type === 'error') {
              shouldUseMock = true;
              await reader.cancel();
              break streamLoop;
            }
          }

          if (done) {
            break;
          }
        }

        if (!shouldUseMock && receivedContent) {
          activeOperationId = null;
          set((state) => ({
            ...state,
            messages: state.messages.map((message) =>
              message.id === assistantMessage.id
                ? {
                    ...message,
                    isStreaming: false,
                  }
                : message,
            ),
            isLoading: false,
          }));
          return;
        }

        shouldUseMock = true;
      } catch {
        shouldUseMock = true;
      } finally {
        reader.releaseLock();
      }
    }

    if (!shouldUseMock || activeOperationId !== operationId) {
      return;
    }

    const mockText =
      MOCK_AI_RESPONSES[
        initialState.mockResponseIndex % MOCK_AI_RESPONSES.length
      ] ?? '';
    const words = mockText.split(' ');
    let wordIndex = 0;

    set((state) => ({
      ...state,
      messages: state.messages.map((message) =>
        message.id === assistantMessage.id
          ? {
              ...message,
              content: '',
              isStreaming: true,
              resolvedProvider: undefined,
              resolvedModel: undefined,
              isMockResponse: true,
            }
          : message,
      ),
    }));

    await new Promise<void>((resolve) => {
      resolveMockStream = resolve;
      activeMockInterval = window.setInterval(() => {
        if (activeOperationId !== operationId) {
          stopMockStream();
          return;
        }

        const word = words[wordIndex];
        if (word === undefined) {
          stopMockStream();
          activeOperationId = null;
          set((state) => ({
            ...state,
            messages: state.messages.map((message) =>
              message.id === assistantMessage.id
                ? {
                    ...message,
                    isStreaming: false,
                  }
                : message,
            ),
            isLoading: false,
            mockResponseIndex:
              (state.mockResponseIndex + 1) % MOCK_AI_RESPONSES.length,
          }));
          return;
        }

        set((state) => ({
          ...state,
          messages: state.messages.map((message) =>
            message.id === assistantMessage.id
              ? {
                  ...message,
                  content: `${message.content}${word} `,
                }
              : message,
          ),
        }));
        wordIndex += 1;
      }, 40);
    });
  },

  setProvider: (provider) => {
    set({
      selectedProvider: provider === 'puter' ? 'auto' : provider,
    });
  },

  setModel: (model) => {
    set({ selectedModel: model });
  },

  clearMessages: () => {
    activeOperationId = null;
    stopMockStream();
    set({
      messages: [],
      isLoading: false,
    });
  },
}));

function buildOpenFileContext(
  activeFile: OpenCodeFileContext | null,
  openFiles: Array<{
    id: string;
    content: string;
    language: string;
  }>,
): OpenCodeFileContext[] {
  const result: OpenCodeFileContext[] = [];
  const seen = new Set<string>();

  if (activeFile) {
    result.push(activeFile);
    seen.add(activeFile.path);
  }

  for (const file of openFiles) {
    if (result.length >= 5) {
      break;
    }
    if (seen.has(file.id)) {
      continue;
    }

    result.push({
      path: file.id,
      content: file.content,
      language: file.language,
    });
    seen.add(file.id);
  }

  return result;
}

function flattenFileTree(nodes: FileNode[]): string[] {
  const paths: string[] = [];

  for (const node of nodes) {
    if (node.type === 'file') {
      paths.push(node.id);
    } else if (node.children) {
      paths.push(...flattenFileTree(node.children));
    }
  }

  return paths;
}
