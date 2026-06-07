import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, type TypeOrmModuleOptions } from '@nestjs/typeorm';
import Joi from 'joi';

import { AppController } from './app.controller';
import { appConfig } from './config/app.config';
import { aiProvidersConfig } from './config/ai-providers.config';
import { databaseConfig } from './config/database.config';
import { AiGatewayModule } from './modules/ai-gateway/ai-gateway.module';
import { AuthModule } from './modules/auth/auth.module';
import { FilesModule } from './modules/files/files.module';
import { ProjectsModule } from './modules/projects/projects.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      expandVariables: true,
      isGlobal: true,
      load: [appConfig, databaseConfig, aiProvidersConfig],
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'test', 'production')
          .default('development'),
        APP_PORT: Joi.number().port().default(4000),
        DATABASE_URL: Joi.string().uri().required(),
        REDIS_URL: Joi.string().uri().required(),
        JWT_SECRET: Joi.string().min(8).required(),
        API_KEY_ENCRYPTION_SECRET: Joi.string().min(16).required(),
        PUTER_API_KEY: Joi.string().allow('').optional(),
        OPENCODE_API_KEY: Joi.string().allow('').optional(),
        OPENROUTER_API_KEY: Joi.string().allow('').optional(),
        GROQ_API_KEY: Joi.string().allow('').optional(),
        GEMINI_API_KEY: Joi.string().allow('').optional(),
        MISTRAL_API_KEY: Joi.string().allow('').optional(),
        SAMBANOVA_API_KEY: Joi.string().allow('').optional(),
        ZAI_API_KEY: Joi.string().allow('').optional(),
        OLLAMA_BASE_URL: Joi.string().uri().default('http://localhost:11434'),
      }),
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService): TypeOrmModuleOptions => ({
        type: 'postgres',
        url: configService.getOrThrow<string>('database.url'),
        autoLoadEntities: true,
        synchronize: configService.get<string>('app.nodeEnv') === 'development',
      }),
    }),
    AiGatewayModule,
    ProjectsModule,
    FilesModule,
    AuthModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
