import { Injectable, Logger } from '@nestjs/common';

interface RateLimitEntry {
  count: number;
  windowStartAt: number;
}

const PROVIDER_LIMITS: Record<string, number> = {
  groq: 30,
  gemini: 60,
  mistral: 20,
  openrouter: 20,
  sambanova: 20,
  zai: 20,
  ollama: 999,
};

const WINDOW_MS = 60_000;

@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);
  private readonly counters = new Map<string, RateLimitEntry>();

  isAllowed(providerId: string): boolean {
    const limit = PROVIDER_LIMITS[providerId] ?? 20;
    const now = Date.now();
    const entry = this.counters.get(providerId);

    if (!entry || now - entry.windowStartAt > WINDOW_MS) {
      this.counters.set(providerId, { count: 1, windowStartAt: now });
      return true;
    }

    if (entry.count >= limit) {
      this.logger.warn(
        `Rate limit reached for ${providerId}: ${entry.count}/${limit} req/min`,
      );
      return false;
    }

    entry.count += 1;
    return true;
  }

  getUsage(
    providerId: string,
  ): { count: number; limit: number; resetsInMs: number } {
    const limit = PROVIDER_LIMITS[providerId] ?? 20;
    const entry = this.counters.get(providerId);
    const now = Date.now();

    if (!entry || now - entry.windowStartAt > WINDOW_MS) {
      return { count: 0, limit, resetsInMs: WINDOW_MS };
    }

    return {
      count: entry.count,
      limit,
      resetsInMs: Math.max(
        0,
        WINDOW_MS - (now - entry.windowStartAt),
      ),
    };
  }
}
