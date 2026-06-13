import { Module } from '@nestjs/common';

import { ProviderHealthService } from '../ai-gateway/health/provider-health.service';
import { GeminiProvider } from '../ai-gateway/providers/gemini.provider';
import { GroqProvider } from '../ai-gateway/providers/groq.provider';
import { MistralProvider } from '../ai-gateway/providers/mistral.provider';
import { OllamaProvider } from '../ai-gateway/providers/ollama.provider';
import { OpenRouterProvider } from '../ai-gateway/providers/openrouter.provider';
import { PuterProvider } from '../ai-gateway/providers/puter.provider';
import { SambaNovaProvider } from '../ai-gateway/providers/sambanova.provider';
import { ZaiProvider } from '../ai-gateway/providers/zai.provider';
import { RateLimitService } from '../ai-gateway/rate-limit/rate-limit.service';
import { FallbackService } from '../ai-gateway/routing/fallback.service';
import { TaskRouterService } from '../ai-gateway/routing/task-router.service';

const PROVIDERS = [
  GroqProvider,
  GeminiProvider,
  MistralProvider,
  OpenRouterProvider,
  PuterProvider,
  SambaNovaProvider,
  ZaiProvider,
  OllamaProvider,
];

const SHARED_SERVICES = [
  TaskRouterService,
  FallbackService,
  ProviderHealthService,
  RateLimitService,
];

@Module({
  providers: [...PROVIDERS, ...SHARED_SERVICES],
  exports: [...PROVIDERS, ...SHARED_SERVICES],
})
export class ProvidersModule {}
