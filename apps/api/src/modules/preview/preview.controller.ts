import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { PreviewService } from './preview.service';

interface CreatePreviewSessionBody {
  projectPath?: string;
}

interface PreviewParams {
  sessionId: string;
  '*': string;
}

interface CreatePreviewSessionResponse {
  id: string;
  root: string;
  url: string;
}

@Controller('preview')
export class PreviewController {
  constructor(private readonly previewService: PreviewService) {}

  @Post('session')
  createSession(
    @Body() body: CreatePreviewSessionBody,
  ): CreatePreviewSessionResponse {
    try {
      const session = this.previewService.createSession(body?.projectPath);
      return {
        id: session.id,
        root: session.root,
        url: `/preview/session/${session.id}/index.html`,
      };
    } catch (error) {
      throw this.toBadRequest(error);
    }
  }

  @Get('session/:sessionId/*')
  getStaticFile(
    @Param() params: PreviewParams,
    @Req() _request: FastifyRequest,
    @Res() reply: FastifyReply,
  ): void {
    try {
      const file = this.previewService.getFileFromSession(
        params.sessionId,
        params['*'],
      );
      void reply.header('Content-Type', file.contentType).send(file.stream);
    } catch (error) {
      throw this.toNotFound(error);
    }
  }

  private toBadRequest(error: unknown): HttpException {
    return new HttpException(
      { message: error instanceof Error ? error.message : 'Preview request failed.' },
      HttpStatus.BAD_REQUEST,
    );
  }

  private toNotFound(error: unknown): HttpException {
    return new HttpException(
      { message: error instanceof Error ? error.message : 'Preview file not found.' },
      HttpStatus.NOT_FOUND,
    );
  }
}
