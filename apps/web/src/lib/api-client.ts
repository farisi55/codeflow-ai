import type {
  AIStreamChunk,
  AIStreamRequest,
  HealthResponse,
  ProviderCatalogEntry,
} from '@/types/api.types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export const apiClient = {
  async checkHealth(): Promise<boolean> {
    if (!API_URL) {
      return false;
    }

    try {
      const response = await fetch(`${API_URL}/health`, {
        signal: AbortSignal.timeout(3000),
      });
      if (!response.ok) {
        return false;
      }

      const data: HealthResponse = await response.json();
      return data.status === 'ok';
    } catch {
      return false;
    }
  },

  async streamChat(
    request: AIStreamRequest,
  ): Promise<ReadableStream<Uint8Array> | null> {
    if (!API_URL) {
      return null;
    }

    try {
      const response = await fetch(`${API_URL}/ai/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(30000),
      });
      if (!response.ok || !response.body) {
        return null;
      }

      return response.body;
    } catch {
      return null;
    }
  },

  async getProviderCatalog(
    forceRefresh = false,
  ): Promise<ProviderCatalogEntry[] | null> {
    if (!API_URL) {
      return null;
    }

    try {
      const query = forceRefresh ? '?refresh=true' : '';
      const response = await fetch(
        `${API_URL}/ai/providers/catalog${query}`,
        {
          signal: AbortSignal.timeout(20000),
        },
      );
      if (!response.ok) {
        return null;
      }

      return (await response.json()) as ProviderCatalogEntry[];
    } catch {
      return null;
    }
  },
};

export function parseSSELine(line: string): AIStreamChunk | null {
  if (!line.startsWith('data: ')) {
    return null;
  }

  try {
    return JSON.parse(line.slice(6)) as AIStreamChunk;
  } catch {
    return null;
  }
}
