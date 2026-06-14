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
  officialOnly: boolean;
  allowedDomains: string[];
}

export interface WebSearchOptions {
  officialOnly?: boolean;
  includeDomains?: string[];
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
const PUTER_OFFICIAL_DOMAINS = [
  'docs.puter.com',
  'developer.puter.com',
];

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
      /\b(?:search|browse)\s+(?:the\s+)?(?:internet|web)\b/,
      /\b(?:cari|jelajah|telusuri)\s+(?:di\s+)?(?:internet|web)\b/,
      /\b(?:google|web\s+search|internet\s+search)\b/,
      /\b(?:official\s+(?:documentation|docs|sources?)|dokumentasi\s+resmi|sumber\s+resmi)\b/,
      /\b(?:latest|current|up[\s-]?to[\s-]?date|terbaru)\b[\s\S]{0,40}\b(?:documentation|docs|dokumentasi|api|spec|version|release)\b/,
      /\b(?:documentation|docs|dokumentasi|api|spec|version|release)\b[\s\S]{0,40}\b(?:latest|current|up[\s-]?to[\s-]?date|terbaru)\b/,
    ].some((pattern) => pattern.test(text));
  }

  getSearchOptions(userRequest: string): WebSearchOptions {
    const text = userRequest.toLowerCase();
    const officialOnly =
      /\b(official\s+(?:documentation|docs|sources?)|only\s+official|dokumentasi\s+resmi|sumber\s+resmi|hanya\s+(?:gunakan\s+)?(?:dokumentasi|sumber)\s+resmi)\b/i.test(
        text,
      );
    const includeDomains =
      officialOnly && /\bputer(?:\.ai)?\b/i.test(text)
        ? PUTER_OFFICIAL_DOMAINS
        : [];

    return { officialOnly, includeDomains };
  }

  async search(
    query: string,
    maxResults = DEFAULT_MAX_RESULTS,
    options: WebSearchOptions = {},
  ): Promise<WebSearchResponse | null> {
    if (!this.isAvailable()) {
      return null;
    }

    const attempts: Array<() => Promise<WebSearchResponse>> = [];
    if (this.tavilyApiKey) {
      attempts.push(() =>
        this.searchTavily(query, maxResults, options),
      );
    }
    if (this.firecrawlApiKey) {
      attempts.push(() =>
        this.searchFirecrawl(query, maxResults, options),
      );
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
      response.officialOnly
        ? response.allowedDomains.length > 0
          ? `Use ONLY official sources from these domains: ${response.allowedDomains.join(', ')}.`
          : 'Use ONLY primary official documentation and official vendor sources from the results below.'
        : 'These results may be more recent or accurate than your training data.',
      'For concrete technical details - CDN or package URLs, import paths, API method names, function signatures, configuration keys, and version numbers - you MUST use exactly what appears below.',
      'Only rely on your own knowledge for details these results do not cover.',
      'Cite the source URL(s) you used.',
      '',
      ...response.results.flatMap((result, index) => [
        `[${index + 1}] ${result.title || 'Untitled'}`,
        `URL: ${result.url}`,
        `Content: ${this.truncate(result.content, 3_000)}`,
        '',
      ]),
    ];

    return lines.join('\n');
  }

  private async searchTavily(
    query: string,
    maxResults: number,
    options: WebSearchOptions,
  ): Promise<WebSearchResponse> {
    const includeDomains = options.includeDomains ?? [];
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
          include_raw_content: true,
          max_results: maxResults,
          ...(includeDomains.length > 0
            ? { include_domains: includeDomains }
            : {}),
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Tavily failed with HTTP ${response.status}`);
    }

    const json = (await response.json()) as TavilyResponse;
    const results = this.filterAndSortResults(
      (json.results ?? [])
        .map((item) => ({
          title: item.title ?? 'Untitled',
          url: item.url ?? '',
          content: item.raw_content ?? item.content ?? '',
          source: 'tavily' as const,
        }))
        .filter((item) => item.url && item.content),
      options,
    ).slice(0, maxResults);

    return {
      provider: 'tavily',
      query,
      results,
      officialOnly: options.officialOnly === true,
      allowedDomains: includeDomains,
    };
  }

  private async searchFirecrawl(
    query: string,
    maxResults: number,
    options: WebSearchOptions,
  ): Promise<WebSearchResponse> {
    const includeDomains = options.includeDomains ?? [];
    const scopedQuery =
      includeDomains.length > 0
        ? `${query} ${includeDomains
            .map((domain) => `site:${domain}`)
            .join(' OR ')}`
        : query;
    const response = await this.fetchWithTimeout(
      'https://api.firecrawl.dev/v1/search',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.firecrawlApiKey}`,
        },
        body: JSON.stringify({
          query: scopedQuery,
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
    const results = this.filterAndSortResults(
      (json.data ?? [])
        .map((item) => ({
          title: item.title ?? 'Untitled',
          url: item.url ?? '',
          content:
            item.markdown ?? item.content ?? item.description ?? '',
          source: 'firecrawl' as const,
        }))
        .filter((item) => item.url && item.content),
      options,
    ).slice(0, maxResults);

    return {
      provider: 'firecrawl',
      query,
      results,
      officialOnly: options.officialOnly === true,
      allowedDomains: includeDomains,
    };
  }

  private filterAndSortResults(
    results: WebSearchResult[],
    options: WebSearchOptions,
  ): WebSearchResult[] {
    const includeDomains = options.includeDomains ?? [];
    if (includeDomains.length === 0) {
      return results;
    }

    return results
      .filter((result) => {
        try {
          const hostname = new URL(result.url).hostname.toLowerCase();
          return includeDomains.some(
            (domain) =>
              hostname === domain || hostname.endsWith(`.${domain}`),
          );
        } catch {
          return false;
        }
      })
      .sort((left, right) => {
        const leftRank = this.domainRank(left.url, includeDomains);
        const rightRank = this.domainRank(right.url, includeDomains);
        return leftRank - rightRank;
      });
  }

  private domainRank(url: string, domains: string[]): number {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      const rank = domains.findIndex(
        (domain) =>
          hostname === domain || hostname.endsWith(`.${domain}`),
      );
      return rank === -1 ? domains.length : rank;
    } catch {
      return domains.length;
    }
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
