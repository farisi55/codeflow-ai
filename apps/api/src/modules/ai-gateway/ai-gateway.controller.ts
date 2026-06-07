import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { AIRequestDto } from './dto/ai-request.dto';
import { AIResponseDto } from './dto/ai-response.dto';
import { AiGatewayService } from './ai-gateway.service';

@ApiTags('ai')
@Controller('ai')
export class AiGatewayController {
  constructor(private readonly aiGatewayService: AiGatewayService) {}

  @Post('chat')
  @ApiOperation({ summary: 'Complete an AI chat request' })
  chat(@Body() request: AIRequestDto): Promise<AIResponseDto> {
    return this.aiGatewayService.complete(request);
  }

  @Post('stream')
  @ApiOperation({ summary: 'Stream an AI chat request' })
  stream(@Body() request: AIRequestDto): AsyncIterable<string> {
    return this.aiGatewayService.stream(request);
  }
}
