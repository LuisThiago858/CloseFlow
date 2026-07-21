import { Inject, Injectable } from '@nestjs/common';

import { ApplicationError } from '../../../../common/errors/application-error';
import { isValidEmail, normalizeEmail } from '../../domain/email';
import type { SessionPolicy } from '../../domain/session-policy';
import {
  CLOCK,
  IDENTITY_REPOSITORY,
  PASSWORD_HASHER,
  SESSION_POLICY,
  SESSION_TOKEN_SERVICE,
} from '../identity.tokens';
import type { Clock } from '../ports/clock';
import {
  InactiveUserError,
  PersistenceConflictError,
  type IdentityRepository,
} from '../ports/identity.repository';
import type { PasswordHasher } from '../ports/password-hasher';
import type { SessionTokenService } from '../ports/session-token-service';
import { toPublicUser } from '../public-presenters';
import type { IssuedAuthentication } from './register-user.use-case';

export interface LoginUserInput {
  email: string;
  password: string;
}

const invalidCredentials = (): ApplicationError =>
  new ApplicationError({
    kind: 'unauthenticated',
    code: 'INVALID_CREDENTIALS',
    detail: 'E-mail ou senha inválidos.',
  });

@Injectable()
export class LoginUserUseCase {
  public constructor(
    @Inject(IDENTITY_REPOSITORY)
    private readonly repository: IdentityRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
    @Inject(SESSION_TOKEN_SERVICE)
    private readonly sessionTokens: SessionTokenService,
    @Inject(SESSION_POLICY) private readonly sessionPolicy: SessionPolicy,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  public async execute(input: LoginUserInput): Promise<IssuedAuthentication> {
    const normalizedEmail = isValidEmail(input.email)
      ? normalizeEmail(input.email).normalizedEmail
      : '__invalid_email__';
    const user =
      await this.repository.findUserByNormalizedEmail(normalizedEmail);
    const passwordMatches = await this.passwordHasher.verifyForLogin(
      input.password,
      user?.passwordHash ?? null,
    );

    if (!passwordMatches || user === null || user.status !== 'ACTIVE') {
      throw invalidCredentials();
    }

    const token = this.sessionTokens.generate();
    const now = this.clock.now();
    const expiresAt = this.sessionPolicy.getInitialExpiration(now);

    try {
      const updatedUser = await this.repository.createLoginSession(
        user.id,
        {
          tokenHash: token.tokenHash,
          createdAt: now,
          lastUsedAt: now,
          expiresAt,
        },
        now,
      );

      return {
        user: toPublicUser(updatedUser),
        rawToken: token.rawToken,
        expiresAt,
      };
    } catch (error: unknown) {
      if (error instanceof InactiveUserError) {
        throw invalidCredentials();
      }
      if (error instanceof PersistenceConflictError) {
        throw new ApplicationError({
          kind: 'conflict',
          code: 'PERSISTENCE_CONFLICT',
          detail: 'Não foi possível iniciar a sessão. Tente novamente.',
        });
      }
      throw error;
    }
  }
}
