import { create } from 'zustand';

import { apiClient, parseSSELine } from '@/lib/api-client';
import { puterClient } from '@/lib/puter-client';
import { MOCK_AI_RESPONSES } from '@/mock/ai-responses';
import type {
  AIActiveFileContext,
  AIFileOperation,
  AIStreamChunk,
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

const PUTER_SYSTEM_PROMPT = `You are an expert AI coding assistant integrated into CodeFlow AI.
Help developers write, review, refactor, and understand code.
Provide clear, concise, accurate responses.
When providing code, always use markdown code blocks with the language specified.
Keep responses focused and practical.`;

const PUTER_ACTIVE_FILE_PROMPT = `An active editor file is included with the user's request.
When the user asks to change, fix, refactor, add, remove, or implement something in that file:
- Return the complete updated file, including all unchanged sections.
- Put the complete file in exactly one fenced markdown code block.
- Label the code block with the file's language.
- Do not provide alternatives or additional code blocks.
- Do not omit unchanged code or use placeholders.
The code block must contain only the final file content.`;

const PUTER_CREATE_FILE_PROMPT = `The user requested creation of a new file.
- Return the complete contents of exactly one new file.
- Put the complete file in exactly one fenced markdown code block.
- Label the code block with the new file's language.
- Do not rewrite or return the active reference file.
- Do not provide alternatives, additional code blocks, or placeholders.
The code block must contain only the final new file content.`;

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

function buildPuterMessages(
  content: string,
  context: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>,
  options: SendMessageOptions,
): PuterAIMessage[] {
  const activeFile = options.activeFile;
  const createOperation = options.fileOperation?.type === 'create';
  const systemPrompt = createOperation
    ? `${PUTER_SYSTEM_PROMPT}\n\n${PUTER_CREATE_FILE_PROMPT}`
    : activeFile
      ? `${PUTER_SYSTEM_PROMPT}\n\n${PUTER_ACTIVE_FILE_PROMPT}`
      : PUTER_SYSTEM_PROMPT;
  const userContent =
    activeFile || createOperation
      ? [
          `User request: ${content}`,
          ...(createOperation
            ? [
                `Requested operation: create new file`,
                `Requested new file path: ${
                  options.fileOperation?.path ?? 'infer from request'
                }`,
              ]
            : []),
          ...(activeFile
            ? [
                '',
                `Active reference file path: ${activeFile.id}`,
                `Active reference file name: ${activeFile.name}`,
                `Active reference file language: ${activeFile.language}`,
                `Auto-Apply mode: ${
                  options.autoApply ? 'enabled' : 'disabled'
                }`,
                '',
                '--- BEGIN ACTIVE REFERENCE FILE CONTENT ---',
                activeFile.content,
                '--- END ACTIVE REFERENCE FILE CONTENT ---',
              ]
            : []),
        ].join('\n')
      : content;

  return [
    { role: 'system', content: systemPrompt },
    ...context,
    { role: 'user', content: userContent },
  ];
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
    activeOperationId = operationId;

    set((state) => ({
      ...state,
      messages: [...state.messages, userMessage, assistantMessage],
      isLoading: true,
    }));

    const shouldUsePuter =
      (selectedProvider === 'puter' || selectedProvider === 'auto') &&
      puterClient.isLoaded() &&
      puterClient.isSignedIn();

    if (shouldUsePuter) {
      const resolvedModel =
        selectedModel !== 'Auto' && selectedModel !== 'auto'
          ? selectedModel
          : 'gpt-5.4-nano';

      try {
        let receivedContent = false;
        const puterMessages = buildPuterMessages(
          trimmedContent,
          context,
          options,
        );

        for await (const token of puterClient.streamChat(
          puterMessages,
          resolvedModel,
        )) {
          if (activeOperationId !== operationId) {
            return;
          }
          receivedContent = true;
          set((state) => ({
            messages: state.messages.map((message) =>
              message.id === assistantMessage.id
                ? {
                    ...message,
                    content: message.content + token,
                  }
                : message,
            ),
          }));
        }

        if (!receivedContent) {
          throw new Error('Puter returned an empty stream');
        }

        activeOperationId = null;
        set((state) => ({
          messages: state.messages.map((message) =>
            message.id === assistantMessage.id
              ? {
                  ...message,
                  isStreaming: false,
                  resolvedProvider: 'puter',
                  resolvedModel,
                }
              : message,
          ),
          isLoading: false,
        }));
        return;
      } catch (error) {
        if (activeOperationId !== operationId) {
          return;
        }

        const message =
          error instanceof Error ? error.message : String(error);
        console.warn(
          `[Puter] Direct call failed, falling through to backend: ${message}`,
        );
        set((state) => ({
          messages: state.messages.map((chatMessage) =>
            chatMessage.id === assistantMessage.id
              ? { ...chatMessage, content: '' }
              : chatMessage,
          ),
        }));
      }
    }

    const stream = await apiClient.streamChat({
      content: trimmedContent,
      provider: selectedProvider,
      model: selectedModel === 'Auto' ? 'auto' : selectedModel,
      activeFile: options.activeFile,
      fileOperation: options.fileOperation,
      autoApply: options.autoApply,
      context,
    });

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
              receivedContent = true;
              set((state) => ({
                ...state,
                messages: state.messages.map((message) =>
                  message.id === assistantMessage.id
                    ? {
                        ...message,
                        content: message.content + chunk.content,
                      }
                    : message,
                ),
              }));
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
    set({ selectedProvider: provider });
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
