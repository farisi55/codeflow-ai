import { Injectable, Logger } from '@nestjs/common';

export type HealthStatus = 'healthy' | 'degraded' | 'down';

interface ProviderHealth {
  status: HealthStatus;
  failureCount: number;
  lastFailureAt: Date | null;
  downUntil: Date | null;
}

const FAILURE_THRESHOLD = 3;
const RECOVERY_MS = 60_000;

@Injectable()
export class ProviderHealthService {
  private readonly logger = new Logger(ProviderHealthService.name);
  private readonly health = new Map<string, ProviderHealth>();

  isHealthy(providerId: string): boolean {
    const entry = this.getOrInit(providerId);

    if (
      entry.status === 'down' &&
      entry.downUntil &&
      Date.now() > entry.downUntil.getTime()
    ) {
      this.logger.log(`Provider ${providerId} auto-recovered`);
      entry.status = 'healthy';
      entry.failureCount = 0;
      entry.downUntil = null;
    }

    return entry.status !== 'down';
  }

  recordSuccess(providerId: string): void {
    const entry = this.getOrInit(providerId);
    entry.status = 'healthy';
    entry.failureCount = 0;
    entry.downUntil = null;
  }

  recordFailure(providerId: string): void {
    const entry = this.getOrInit(providerId);
    entry.failureCount += 1;
    entry.lastFailureAt = new Date();

    if (entry.failureCount >= FAILURE_THRESHOLD) {
      entry.status = 'down';
      entry.downUntil = new Date(Date.now() + RECOVERY_MS);
      this.logger.warn(
        `Provider ${providerId} marked down after ${entry.failureCount} failures. Retrying after ${RECOVERY_MS / 1000}s`,
      );
      return;
    }

    entry.status = 'degraded';
    this.logger.warn(
      `Provider ${providerId} degraded (failure ${entry.failureCount}/${FAILURE_THRESHOLD})`,
    );
  }

  getStatus(providerId: string): HealthStatus {
    this.isHealthy(providerId);
    return this.getOrInit(providerId).status;
  }

  getAllStatuses(): Record<string, HealthStatus> {
    const result: Record<string, HealthStatus> = {};
    for (const providerId of this.health.keys()) {
      result[providerId] = this.getStatus(providerId);
    }
    return result;
  }

  private getOrInit(providerId: string): ProviderHealth {
    const existing = this.health.get(providerId);
    if (existing) {
      return existing;
    }

    const created: ProviderHealth = {
      status: 'healthy',
      failureCount: 0,
      lastFailureAt: null,
      downUntil: null,
    };
    this.health.set(providerId, created);
    return created;
  }
}
