import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';

import { AIGatewayService } from './ai-gateway.service';
import { AIStreamDto } from './dto/ai-stream.dto';

@Controller('ai')
export class AIGatewayController {
  constructor(private readonly aiGateway: AIGatewayService) {}

  @Post('stream')
  @HttpCode(200)
  async streamChat(
    @Body() dto: AIStreamDto,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    reply.hijack();
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin':
        reply.request.headers.origin ?? '*',
    });

    await this.aiGateway.streamChat(dto, reply.raw);
  }

  @Get('providers')
  getProviders(): Record<string, boolean> {
    return this.aiGateway.getProviderStatuses();
  }

  @Get('providers/catalog')
  getProviderCatalog(
    @Query('refresh') refresh?: string,
  ): Promise<
    Awaited<ReturnType<AIGatewayService['getProviderCatalog']>>
  > {
    return this.aiGateway.getProviderCatalog(refresh === 'true');
  }
}
