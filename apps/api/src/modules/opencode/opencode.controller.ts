import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Res,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';

import {
  OpenCodeService,
  type OpenFileContext,
} from './opencode.service';

class OpenFileDto implements OpenFileContext {
  @IsString()
  path!: string;

  @IsString()
  content!: string;

  @IsString()
  language!: string;
}

class OpenCodeContextMessageDto {
  @IsIn(['user', 'assistant'])
  role!: 'user' | 'assistant';

  @IsString()
  content!: string;
}

class OpenCodeFileOperationDto {
  @IsIn(['create'])
  type!: 'create';

  @IsString()
  @IsOptional()
  path?: string;
}

class OpenCodeStreamDto {
  @IsString()
  content!: string;

  @IsString()
  @IsOptional()
  projectName = '';

  @ValidateNested()
  @Type(() => OpenFileDto)
  @IsOptional()
  activeFile: OpenFileDto | null = null;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OpenFileDto)
  @IsOptional()
  openFiles: OpenFileDto[] = [];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  filePaths: string[] = [];

  @ValidateNested()
  @Type(() => OpenCodeFileOperationDto)
  @IsOptional()
  fileOperation?: OpenCodeFileOperationDto;

  @IsBoolean()
  @IsOptional()
  autoApply = false;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OpenCodeContextMessageDto)
  @IsOptional()
  context: OpenCodeContextMessageDto[] = [];
}

@Controller('ai/opencode')
export class OpenCodeController {
  constructor(private readonly openCode: OpenCodeService) {}

  @Get('health')
  health(): ReturnType<OpenCodeService['getHealth']> {
    return this.openCode.getHealth();
  }

  @Post('stream')
  @HttpCode(200)
  async stream(
    @Body() dto: OpenCodeStreamDto,
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

    await this.openCode.streamChat(dto, reply.raw);
  }
}
