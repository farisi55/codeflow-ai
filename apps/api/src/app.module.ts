import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { appConfig } from './config/app.config';
import { providersConfig } from './config/providers.config';
import { AIGatewayModule } from './modules/ai-gateway/ai-gateway.module';
import { OpenCodeModule } from './modules/opencode/opencode.module';
import { TerminalModule } from './modules/terminal/terminal.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, providersConfig],
      envFilePath: ['.env.local', '.env'],
    }),
    AIGatewayModule,
    OpenCodeModule,
    TerminalModule,
  ],
})
export class AppModule {}
