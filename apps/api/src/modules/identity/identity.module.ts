import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ThrottlerGuard } from '@nestjs/throttler';

import type { Environment } from '../../config/environment';
import { DatabaseModule } from '../../shared/database/database.module';
import { SessionPolicy } from './domain/session-policy';
import {
  CLOCK,
  IDENTITY_REPOSITORY,
  PASSWORD_HASHER,
  SESSION_POLICY,
  SESSION_TOKEN_SERVICE,
} from './application/identity.tokens';
import { AuthenticateSessionUseCase } from './application/use-cases/authenticate-session.use-case';
import { GetCurrentUserUseCase } from './application/use-cases/get-current-user.use-case';
import { ListSessionsUseCase } from './application/use-cases/list-sessions.use-case';
import { LoginUserUseCase } from './application/use-cases/login-user.use-case';
import { LogoutCurrentSessionUseCase } from './application/use-cases/logout-current-session.use-case';
import { RegisterUserUseCase } from './application/use-cases/register-user.use-case';
import { RevokeSessionUseCase } from './application/use-cases/revoke-session.use-case';
import { ArgonPasswordHasher } from './infrastructure/argon-password-hasher';
import { CryptoSessionTokenService } from './infrastructure/crypto-session-token.service';
import { PrismaIdentityRepository } from './infrastructure/prisma-identity.repository';
import { SystemClock } from './infrastructure/system-clock';
import { AuthController } from './presentation/auth.controller';
import { BrowserMutationGuard } from './presentation/browser-mutation.guard';
import { JsonBodyGuard } from './presentation/json-body.guard';
import { SessionAuthGuard } from './presentation/session-auth.guard';
import { SessionCookieService } from './presentation/session-cookie.service';

@Module({
  imports: [DatabaseModule],
  controllers: [AuthController],
  providers: [
    { provide: IDENTITY_REPOSITORY, useClass: PrismaIdentityRepository },
    { provide: PASSWORD_HASHER, useClass: ArgonPasswordHasher },
    { provide: SESSION_TOKEN_SERVICE, useClass: CryptoSessionTokenService },
    { provide: CLOCK, useClass: SystemClock },
    {
      provide: SESSION_POLICY,
      inject: [ConfigService],
      useFactory: (configService: ConfigService<Environment, true>) =>
        new SessionPolicy({
          ttlSeconds: configService.get('AUTH_SESSION_TTL_SECONDS', {
            infer: true,
          }),
          absoluteTtlSeconds: configService.get(
            'AUTH_SESSION_ABSOLUTE_TTL_SECONDS',
            { infer: true },
          ),
          renewalWindowSeconds: configService.get(
            'AUTH_SESSION_RENEWAL_WINDOW_SECONDS',
            { infer: true },
          ),
          activityIntervalSeconds: configService.get(
            'AUTH_SESSION_ACTIVITY_INTERVAL_SECONDS',
            { infer: true },
          ),
        }),
    },
    AuthenticateSessionUseCase,
    GetCurrentUserUseCase,
    ListSessionsUseCase,
    LoginUserUseCase,
    LogoutCurrentSessionUseCase,
    RegisterUserUseCase,
    RevokeSessionUseCase,
    BrowserMutationGuard,
    JsonBodyGuard,
    SessionAuthGuard,
    SessionCookieService,
    ThrottlerGuard,
  ],
})
export class IdentityModule {}
