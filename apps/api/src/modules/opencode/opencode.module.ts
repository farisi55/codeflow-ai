import { Module } from '@nestjs/common';

import { OpenCodeController } from './opencode.controller';
import { OpenCodeService } from './opencode.service';

@Module({
  controllers: [OpenCodeController],
  providers: [OpenCodeService],
  exports: [OpenCodeService],
})
export class OpenCodeModule {}
