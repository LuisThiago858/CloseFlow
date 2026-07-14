import { randomUUID } from 'node:crypto';

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';

import { GlobalExceptionFilter } from './common/http/global-exception.filter';
import { validateEnvironment } from './config/environment';
import type { Environment } from './config/environment';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ['../../.env', '.env'],
      validate: validateEnvironment,
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<Environment, true>) => ({
        pinoHttp: {
          level: configService.get('LOG_LEVEL', { infer: true }),
          autoLogging:
            configService.get('NODE_ENV', { infer: true }) !== 'test',
          genReqId: (request, response) => {
            const receivedId = request.headers['x-request-id'];
            const requestId =
              typeof receivedId === 'string' && receivedId.length <= 128
                ? receivedId
                : randomUUID();

            response.setHeader('x-request-id', requestId);
            return requestId;
          },
          redact: {
            paths: [
              'req.headers.authorization',
              'req.headers.cookie',
              'res.headers["set-cookie"]',
            ],
            censor: '[REDACTED]',
          },
        },
      }),
    }),
    HealthModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule {}
