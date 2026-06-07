export interface AIStreamRequest {
  content: string;
  provider: string;
  model: string;
  context: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

export interface AIStreamChunk {
  type: 'chunk' | 'done' | 'error';
  content?: string;
  provider?: string;
  model?: string;
  error?: string;
}

export interface HealthResponse {
  status: 'ok';
  timestamp: string;
}
