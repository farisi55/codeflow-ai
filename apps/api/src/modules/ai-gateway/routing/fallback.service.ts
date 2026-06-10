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
    requestedProvider: string,
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

      const useRequestedModel =
        requestedProvider === providerId &&
        requestedModel.length > 0 &&
        requestedModel !== 'auto';
      const modelCandidates = [
        ...new Set([
          ...(useRequestedModel ? [requestedModel] : []),
          ...provider.getFallbackModels(),
        ]),
      ];
      let attemptedProvider = false;

      for (const model of modelCandidates) {
        if (!this.rateLimit.isAllowed(providerId)) {
          this.logger.debug(`Skipping ${providerId}: rate limited`);
          break;
        }

        attemptedProvider = true;
        tried.push(`${providerId}/${model}`);

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
          this.logger.log(
            `Using provider: ${providerId} / model: ${model}`,
          );

          return {
            stream: this.prependToken(firstResult.value, generator),
            providerId,
            modelId: model,
          };
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          this.logger.warn(
            `Provider ${providerId} model ${model} failed: ${message}`,
          );
        }
      }

      if (attemptedProvider) {
        this.health.recordFailure(providerId);
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
