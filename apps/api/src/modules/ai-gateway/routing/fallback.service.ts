import { Injectable, Logger } from '@nestjs/common';

import { ProviderHealthService } from '../health/provider-health.service';
import type {
  IProvider,
  ProviderMessage,
} from '../interfaces/provider.interface';
import { RateLimitService } from '../rate-limit/rate-limit.service';

export interface FallbackResult {
  stream: AsyncGenerator<string, void, unknown>;
  providerId: string;
  modelId: string;
}

@Injectable()
export class FallbackService {
  private readonly logger = new Logger(FallbackService.name);

  constructor(
    private readonly health: ProviderHealthService,
    private readonly rateLimit: RateLimitService,
  ) {}

  async execute(
    providerOrder: string[],
    providerMap: Map<string, IProvider>,
    messages: ProviderMessage[],
    requestedModel: string,
    signal?: AbortSignal,
  ): Promise<FallbackResult> {
    const tried: string[] = [];

    for (const providerId of providerOrder) {
      if (signal?.aborted) {
        throw new Error('Request aborted');
      }

      const provider = providerMap.get(providerId);
      if (!provider) {
        continue;
      }

      if (!provider.isAvailable()) {
        this.logger.debug(
          `Skipping ${providerId}: not available (no credentials)`,
        );
        continue;
      }

      if (!this.health.isHealthy(providerId)) {
        this.logger.debug(`Skipping ${providerId}: marked down`);
        continue;
      }

      if (!this.rateLimit.isAllowed(providerId)) {
        this.logger.debug(`Skipping ${providerId}: rate limited`);
        continue;
      }

      tried.push(providerId);
      const model =
        requestedModel && requestedModel !== 'auto'
          ? requestedModel
          : (provider.models[0] ?? 'auto');

      try {
        this.logger.log(
          `Trying provider: ${providerId} / model: ${model}`,
        );
        const generator = provider.stream(messages, model, signal);
        const firstResult = await generator.next();

        if (firstResult.done) {
          throw new Error('Empty stream from provider');
        }

        this.health.recordSuccess(providerId);
        this.logger.log(`Using provider: ${providerId}`);

        return {
          stream: this.prependToken(firstResult.value, generator),
          providerId,
          modelId: model,
        };
      } catch (error) {
        this.health.recordFailure(providerId);
        const message =
          error instanceof Error ? error.message : String(error);
        this.logger.warn(`Provider ${providerId} failed: ${message}`);
      }
    }

    throw new Error(
      `All providers exhausted. Tried: [${tried.join(', ')}]. ` +
        'Check that at least one provider has a valid API key in .env',
    );
  }

  private async *prependToken(
    first: string,
    rest: AsyncGenerator<string, void, unknown>,
  ): AsyncGenerator<string, void, unknown> {
    yield first;
    yield* rest;
  }
}
