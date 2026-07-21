import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';

import { GlobalExceptionFilter } from './common/http/global-exception.filter';
import { validateEnvironment } from './config/environment';
import type { Environment } from './config/environment';
import { HealthModule } from './modules/health/health.module';
import { IdentityModule } from './modules/identity/identity.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ['../../.env', '.env'],
      validate: validateEnvironment,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<Environment, true>) => [
        {
          ttl: configService.get('AUTH_RATE_LIMIT_WINDOW_MS', { infer: true }),
          limit: configService.get('AUTH_RATE_LIMIT_MAX', { infer: true }),
        },
      ],
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<Environment, true>) => ({
        pinoHttp: {
          level: configService.get('LOG_LEVEL', { infer: true }),
          autoLogging:
            configService.get('NODE_ENV', { infer: true }) !== 'test',
          wrapSerializers: false,
          serializers: {
            req: (request: IncomingMessage) => ({
              id: request.id,
              method: request.method,
              url: request.url,
            }),
            res: (response: ServerResponse) => ({
              statusCode: response.statusCode,
            }),
          },
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
              'req.body.password',
              'req.body.passwordConfirmation',
              'req.body.passwordHash',
              'req.body.token',
              'req.body.tokenHash',
            ],
            censor: '[REDACTED]',
          },
        },
      }),
    }),
    HealthModule,
    IdentityModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule {}
