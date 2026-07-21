import { Inject, Injectable } from '@nestjs/common';

import { ApplicationError } from '../../../../common/errors/application-error';
import { isValidEmail, normalizeEmail } from '../../domain/email';
import { isPasswordAllowed } from '../../domain/password-policy';
import type { PublicUser } from '../../domain/identity.types';
import {
  CLOCK,
  IDENTITY_REPOSITORY,
  PASSWORD_HASHER,
  SESSION_POLICY,
  SESSION_TOKEN_SERVICE,
} from '../identity.tokens';
import type { Clock } from '../ports/clock';
import {
  DuplicateEmailError,
  PersistenceConflictError,
  type IdentityRepository,
} from '../ports/identity.repository';
import type { PasswordHasher } from '../ports/password-hasher';
import type { SessionTokenService } from '../ports/session-token-service';
import { toPublicUser } from '../public-presenters';
import type { SessionPolicy } from '../../domain/session-policy';

export interface RegisterUserInput {
  email: string;
  password: string;
  passwordConfirmation: string;
}

export interface IssuedAuthentication {
  user: PublicUser;
  rawToken: string;
  expiresAt: Date;
}

@Injectable()
export class RegisterUserUseCase {
  public constructor(
    @Inject(IDENTITY_REPOSITORY)
    private readonly repository: IdentityRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
    @Inject(SESSION_TOKEN_SERVICE)
    private readonly sessionTokens: SessionTokenService,
    @Inject(SESSION_POLICY) private readonly sessionPolicy: SessionPolicy,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  public async execute(
    input: RegisterUserInput,
  ): Promise<IssuedAuthentication> {
    const errors: Record<string, readonly string[]> = {};
    if (!isValidEmail(input.email)) {
      errors.email = ['Informe um e-mail válido com até 254 caracteres.'];
    }
    if (!isPasswordAllowed(input.password)) {
      errors.password = ['A senha deve possuir entre 12 e 128 caracteres.'];
    }
    if (input.password !== input.passwordConfirmation) {
      errors.passwordConfirmation = ['A confirmação deve ser igual à senha.'];
    }
    if (Object.keys(errors).length > 0) {
      throw new ApplicationError({
        kind: 'validation',
        code: 'VALIDATION_ERROR',
        detail: 'Revise os dados informados.',
        errors,
      });
    }

    const email = normalizeEmail(input.email);
    const passwordHash = await this.passwordHasher.hash(input.password);
    const token = this.sessionTokens.generate();
    const now = this.clock.now();
    const expiresAt = this.sessionPolicy.getInitialExpiration(now);

    try {
      const user = await this.repository.createUserWithSession({
        ...email,
        passwordHash,
        createdAt: now,
        session: {
          tokenHash: token.tokenHash,
          createdAt: now,
          lastUsedAt: now,
          expiresAt,
        },
      });

      return {
        user: toPublicUser(user),
        rawToken: token.rawToken,
        expiresAt,
      };
    } catch (error: unknown) {
      if (error instanceof DuplicateEmailError) {
        throw new ApplicationError({
          kind: 'conflict',
          code: 'EMAIL_ALREADY_REGISTERED',
          detail: 'Já existe uma conta cadastrada com este e-mail.',
        });
      }
      if (error instanceof PersistenceConflictError) {
        throw new ApplicationError({
          kind: 'conflict',
          code: 'PERSISTENCE_CONFLICT',
          detail: 'Não foi possível concluir o cadastro. Tente novamente.',
        });
      }
      throw error;
    }
  }
}
