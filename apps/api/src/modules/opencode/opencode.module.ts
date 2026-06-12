import { Module } from '@nestjs/common';

import { WebSearchModule } from '../web-search/web-search.module';
import { OpenCodeController } from './opencode.controller';
import { OpenCodeService } from './opencode.service';

@Module({
  imports: [WebSearchModule],
  controllers: [OpenCodeController],
  providers: [OpenCodeService],
  exports: [OpenCodeService],
})
export class OpenCodeModule {}
