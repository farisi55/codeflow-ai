export type AIProvider =
  | 'puter'
  | 'opencode'
  | 'openrouter'
  | 'groq'
  | 'gemini'
  | 'mistral'
  | 'sambanova'
  | 'zai'
  | 'ollama';

export interface AIModel {
  contextWindow?: number;
  id: string;
  label: string;
  provider: AIProvider;
  supportsTools: boolean;
}

export enum TaskType {
  CODE_GENERATION = 'code_generation',
  CODE_REVIEW = 'code_review',
  DEBUGGING = 'debugging',
  DOCUMENTATION = 'documentation',
  EXPLANATION = 'explanation',
  REFACTORING = 'refactoring',
  TEST_GENERATION = 'test_generation',
}

export interface AIMessage {
  content: string;
  name?: string;
  role: 'system' | 'user' | 'assistant' | 'tool';
  toolCallId?: string;
}

export interface AICompletionRequest {
  messages: readonly AIMessage[];
  model?: string;
  provider?: AIProvider;
  taskType?: TaskType;
}

export interface AICompletionResponse {
  content: string;
  finishReason: 'stop' | 'length' | 'tool_call' | 'error';
  model: string;
  provider: AIProvider;
}

export interface AIStreamChunk {
  content: string;
  done: boolean;
  model: string;
  provider: AIProvider;
}
