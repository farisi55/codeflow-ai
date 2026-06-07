import { create } from 'zustand';

import { apiClient, parseSSELine } from '@/lib/api-client';
import { MOCK_AI_RESPONSES } from '@/mock/ai-responses';
import type { AIStreamChunk } from '@/types/api.types';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  resolvedProvider?: string;
  resolvedModel?: string;
}

export type BackendStatus = 'checking' | 'connected' | 'offline';

interface AIState {
  messages: ChatMessage[];
  isLoading: boolean;
  backendStatus: BackendStatus;
  selectedProvider: string;
  selectedModel: string;
  mockResponseIndex: number;
  sendMessage: (content: string) => Promise<void>;
  checkBackend: () => Promise<void>;
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

export const useAIStore = create<AIState>((set, get) => ({
  messages: [],
  isLoading: false,
  backendStatus: 'checking',
  selectedProvider: 'auto',
  selectedModel: 'Auto',
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
  },

  sendMessage: async (content) => {
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

    const stream = await apiClient.streamChat({
      content: trimmedContent,
      provider: selectedProvider,
      model: selectedModel === 'Auto' ? 'auto' : selectedModel,
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
