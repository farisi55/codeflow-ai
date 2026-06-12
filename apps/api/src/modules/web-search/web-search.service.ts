import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface WebSearchResult {
  title: string;
  url: string;
  content: string;
  source: 'tavily' | 'firecrawl';
}

export interface WebSearchResponse {
  provider: 'tavily' | 'firecrawl';
  query: string;
  results: WebSearchResult[];
}

interface TavilySearchItem {
  title?: string;
  url?: string;
  content?: string;
  raw_content?: string;
}

interface TavilyResponse {
  results?: TavilySearchItem[];
}

interface FirecrawlSearchItem {
  title?: string;
  url?: string;
  description?: string;
  markdown?: string;
  content?: string;
}

interface FirecrawlResponse {
  data?: FirecrawlSearchItem[];
}

const DEFAULT_MAX_RESULTS = 5;
const DEFAULT_TIMEOUT_MS = 15_000;

@Injectable()
export class WebSearchService {
  private readonly logger = new Logger(WebSearchService.name);
  private readonly tavilyApiKey: string;
  private readonly firecrawlApiKey: string;
  private readonly timeoutMs: number;

  constructor(private readonly config: ConfigService) {
    this.tavilyApiKey =
      this.config.get<string>('providers.webSearch.tavily.apiKey') ??
      process.env.TAVILY_API_KEY ??
      '';
    this.firecrawlApiKey =
      this.config.get<string>('providers.webSearch.firecrawl.apiKey') ??
      process.env.FIRECRAWL_API_KEY ??
      '';
    const configuredTimeout = Number.parseInt(
      this.config.get<string>('WEB_SEARCH_TIMEOUT_MS') ?? '',
      10,
    );
    this.timeoutMs =
      Number.isFinite(configuredTimeout) && configuredTimeout > 0
        ? configuredTimeout
        : DEFAULT_TIMEOUT_MS;
  }

  isAvailable(): boolean {
    return Boolean(this.tavilyApiKey || this.firecrawlApiKey);
  }

  shouldBrowse(userRequest: string): boolean {
    const text = userRequest.toLowerCase();
    return [
      'internet',
      'web',
      'browse',
      'browsing',
      'search',
      'cari',
      'mencari',
      'google',
      'documentation',
      'docs',
      'api spec',
      'spesifikasi api',
      'latest',
      'terbaru',
      'current',
      'up to date',
      'update terbaru',
    ].some((keyword) => text.includes(keyword));
  }

  async search(
    query: string,
    maxResults = DEFAULT_MAX_RESULTS,
  ): Promise<WebSearchResponse | null> {
    if (!this.isAvailable()) {
      return null;
    }

    const attempts: Array<() => Promise<WebSearchResponse>> = [];
    if (this.tavilyApiKey) {
      attempts.push(() => this.searchTavily(query, maxResults));
    }
    if (this.firecrawlApiKey) {
      attempts.push(() => this.searchFirecrawl(query, maxResults));
    }

    let lastError: unknown;
    for (const attempt of attempts) {
      try {
        const response = await attempt();
        if (response.results.length > 0) {
          return response;
        }
        lastError = new Error(`${response.provider} returned no results`);
      } catch (error) {
        lastError = error;
        this.logger.warn(
          `Web search provider failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    if (lastError) {
      this.logger.warn(
        `All web search providers failed: ${
          lastError instanceof Error ? lastError.message : String(lastError)
        }`,
      );
    }
    return null;
  }

  formatForPrompt(response: WebSearchResponse | null): string {
    if (!response || response.results.length === 0) {
      return '';
    }

    const lines = [
      `Web browsing results from ${response.provider} for query: ${response.query}`,
      'Use these results as external context. Cite URLs when using facts from them.',
      '',
      ...response.results.flatMap((result, index) => [
        `[${index + 1}] ${result.title || 'Untitled'}`,
        `URL: ${result.url}`,
        `Content: ${this.truncate(result.content, 1_500)}`,
        '',
      ]),
    ];

    return lines.join('\n');
  }

  private async searchTavily(
    query: string,
    maxResults: number,
  ): Promise<WebSearchResponse> {
    const response = await this.fetchWithTimeout(
      'https://api.tavily.com/search',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.tavilyApiKey}`,
        },
        body: JSON.stringify({
          query,
          search_depth: 'advanced',
          include_answer: false,
          include_raw_content: false,
          max_results: maxResults,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Tavily failed with HTTP ${response.status}`);
    }

    const json = (await response.json()) as TavilyResponse;
    const results = (json.results ?? [])
      .map((item) => ({
        title: item.title ?? 'Untitled',
        url: item.url ?? '',
        content: item.content ?? item.raw_content ?? '',
        source: 'tavily' as const,
      }))
      .filter((item) => item.url && item.content)
      .slice(0, maxResults);

    return { provider: 'tavily', query, results };
  }

  private async searchFirecrawl(
    query: string,
    maxResults: number,
  ): Promise<WebSearchResponse> {
    const response = await this.fetchWithTimeout(
      'https://api.firecrawl.dev/v1/search',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.firecrawlApiKey}`,
        },
        body: JSON.stringify({
          query,
          limit: maxResults,
          scrapeOptions: {
            formats: ['markdown'],
          },
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Firecrawl failed with HTTP ${response.status}`);
    }

    const json = (await response.json()) as FirecrawlResponse;
    const results = (json.data ?? [])
      .map((item) => ({
        title: item.title ?? 'Untitled',
        url: item.url ?? '',
        content:
          item.markdown ?? item.content ?? item.description ?? '',
        source: 'firecrawl' as const,
      }))
      .filter((item) => item.url && item.content)
      .slice(0, maxResults);

    return { provider: 'firecrawl', query, results };
  }

  private async fetchWithTimeout(
    url: string,
    init: RequestInit,
  ): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
  }

  private truncate(value: string, maxLength: number): string {
    if (value.length <= maxLength) {
      return value;
    }
    return `${value.slice(0, maxLength)}...`;
  }
}
