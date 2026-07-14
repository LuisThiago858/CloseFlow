import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module';
import { configureApplication } from './app/configure-application';
import type { Environment } from './config/environment';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  configureApplication(app);

  const configService = app.get(ConfigService<Environment, true>);
  const port = configService.get('API_PORT', { infer: true });

  await app.listen(port, '127.0.0.1');
}

void bootstrap();
