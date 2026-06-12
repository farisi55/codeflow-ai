import helmet from '@fastify/helmet';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { IoAdapter } from '@nestjs/platform-socket.io';

import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

interface HealthReply {
  status(code: number): {
    send(payload: { status: 'ok'; timestamp: string }): void;
  };
}

type FastifyRegisterPlugin = Parameters<
  NestFastifyApplication['register']
>[0];

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false }),
  );
  app.useWebSocketAdapter(new IoAdapter(app));
  const helmetPlugin = helmet as unknown as FastifyRegisterPlugin;

  await app.register(helmetPlugin, {
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: {
      policy: 'cross-origin',
    },
    frameguard: false,
  });

  const corsOrigin = (
    process.env.CORS_ORIGIN?.trim() ||
    'http://localhost:3000,http://127.0.0.1:3000'
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
  app.enableCors({
    origin: corsOrigin,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  app.getHttpAdapter().get(
    '/health',
    (_request: unknown, reply: HealthReply) => {
      void reply.status(200).send({
        status: 'ok',
        timestamp: new Date().toISOString(),
      });
    },
  );

  const port = parseInt(process.env.APP_PORT ?? '4000', 10);
  await app.listen(port, '0.0.0.0');

  logger.log(`Backend running at http://localhost:${port}`);
  logger.log(`Health check: http://localhost:${port}/health`);
  logger.log(`AI Stream:    POST http://localhost:${port}/ai/stream`);
  logger.log(
    `OpenCode:     POST http://localhost:${port}/ai/opencode/stream`,
  );
  logger.log(`Terminal:     WS   http://localhost:${port}/terminal`);
  logger.log(`Preview:      WS   http://localhost:${port}/preview`);
}

void bootstrap();
