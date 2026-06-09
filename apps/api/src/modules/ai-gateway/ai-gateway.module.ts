import { Module } from '@nestjs/common';

import { SkillsModule } from '../skills/skills.module';
import { AIGatewayController } from './ai-gateway.controller';
import { AIGatewayService } from './ai-gateway.service';
import { ProviderHealthService } from './health/provider-health.service';
import { GeminiProvider } from './providers/gemini.provider';
import { GroqProvider } from './providers/groq.provider';
import { MistralProvider } from './providers/mistral.provider';
import { OllamaProvider } from './providers/ollama.provider';
import { OpenRouterProvider } from './providers/openrouter.provider';
import { PuterProvider } from './providers/puter.provider';
import { RateLimitService } from './rate-limit/rate-limit.service';
import { FallbackService } from './routing/fallback.service';
import { TaskRouterService } from './routing/task-router.service';

@Module({
  imports: [SkillsModule],
  controllers: [AIGatewayController],
  providers: [
    AIGatewayService,
    TaskRouterService,
    FallbackService,
    ProviderHealthService,
    RateLimitService,
    GroqProvider,
    GeminiProvider,
    MistralProvider,
    OpenRouterProvider,
    PuterProvider,
    OllamaProvider,
  ],
  exports: [AIGatewayService],
})
export class AIGatewayModule {}
