import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Res,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';

import { PreviewService } from './preview.service';

interface StaticParams {
  '*': string;
}

@Controller('preview/static')
export class PreviewStaticController {
  constructor(private readonly previewService: PreviewService) {}

  @Get('*')
  getStaticFile(
    @Param() params: StaticParams,
    @Res() reply: FastifyReply,
  ): void {
    try {
      this.previewService.assertEnabled();
      const file = this.previewService.getStaticFile(params['*']);
      void reply.header('Content-Type', file.contentType).send(file.stream);
    } catch (error) {
      throw new HttpException(
        { message: error instanceof Error ? error.message : 'Preview file not found.' },
        HttpStatus.NOT_FOUND,
      );
    }
  }
}
