import { Module } from '@nestjs/common';

import { ProvidersModule } from '../providers/providers.module';
import { PromptOptimizerService } from './prompt-optimizer.service';

@Module({
  imports: [ProvidersModule],
  providers: [PromptOptimizerService],
  exports: [PromptOptimizerService],
})
export class PromptOptimizerModule {}
