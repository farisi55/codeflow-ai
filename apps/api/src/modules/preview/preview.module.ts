import { Module } from '@nestjs/common';

import { PreviewController } from './preview.controller';
import { PreviewGateway } from './preview.gateway';
import { PreviewStaticController } from './preview-static.controller';
import { PreviewService } from './preview.service';

@Module({
  controllers: [PreviewController, PreviewStaticController],
  providers: [PreviewGateway, PreviewService],
})
export class PreviewModule {}
