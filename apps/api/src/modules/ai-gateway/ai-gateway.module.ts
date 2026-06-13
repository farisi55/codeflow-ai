import { Module } from '@nestjs/common';

import { PromptOptimizerModule } from '../prompt-optimizer/prompt-optimizer.module';
import { ProvidersModule } from '../providers/providers.module';
import { SkillsModule } from '../skills/skills.module';
import { WebSearchModule } from '../web-search/web-search.module';
import { AIGatewayController } from './ai-gateway.controller';
import { AIGatewayService } from './ai-gateway.service';

@Module({
  imports: [
    ProvidersModule,
    SkillsModule,
    WebSearchModule,
    PromptOptimizerModule,
  ],
  controllers: [AIGatewayController],
  providers: [AIGatewayService],
  exports: [AIGatewayService],
})
export class AIGatewayModule {}
