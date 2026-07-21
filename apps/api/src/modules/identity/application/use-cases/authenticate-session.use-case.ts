import { Inject, Injectable } from '@nestjs/common';

import { ApplicationError } from '../../../../common/errors/application-error';
import type { AuthenticatedPrincipal } from '../../domain/identity.types';
import type { SessionPolicy } from '../../domain/session-policy';
import {
  CLOCK,
  IDENTITY_REPOSITORY,
  SESSION_POLICY,
  SESSION_TOKEN_SERVICE,
} from '../identity.tokens';
import type { Clock } from '../ports/clock';
import type { IdentityRepository } from '../ports/identity.repository';
import type { SessionTokenService } from '../ports/session-token-service';

export interface AuthenticatedSession {
  principal: AuthenticatedPrincipal;
  renewedExpiresAt: Date | null;
}

const unauthenticated = (): ApplicationError =>
  new ApplicationError({
    kind: 'unauthenticated',
    code: 'UNAUTHENTICATED',
    detail: 'Uma sessão válida é necessária para acessar este recurso.',
  });

@Injectable()
export class AuthenticateSessionUseCase {
  public constructor(
    @Inject(IDENTITY_REPOSITORY)
    private readonly repository: IdentityRepository,
    @Inject(SESSION_TOKEN_SERVICE)
    private readonly sessionTokens: SessionTokenService,
    @Inject(SESSION_POLICY) private readonly sessionPolicy: SessionPolicy,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  public async execute(rawToken: string | null): Promise<AuthenticatedSession> {
    if (rawToken === null) {
      throw unauthenticated();
    }

    const tokenHash = this.sessionTokens.hash(rawToken);
    if (tokenHash === null) {
      throw unauthenticated();
    }

    const session = await this.repository.findSessionByTokenHash(tokenHash);
    if (session === null) {
      throw unauthenticated();
    }

    const now = this.clock.now();
    if (session.user.status !== 'ACTIVE') {
      await this.repository.revokeSessionById(session.id, now, 'USER_DISABLED');
      throw unauthenticated();
    }

    const evaluation = this.sessionPolicy.evaluate(session, now);
    if (!evaluation.valid) {
      throw new ApplicationError({
        kind: 'unauthenticated',
        code:
          evaluation.reason === 'expired'
            ? 'SESSION_EXPIRED'
            : 'SESSION_REVOKED',
        detail:
          evaluation.reason === 'expired'
            ? 'A sessão expirou. Entre novamente para continuar.'
            : 'A sessão foi encerrada. Entre novamente para continuar.',
      });
    }

    if (evaluation.shouldWrite) {
      const touched = await this.repository.touchSession(
        session.id,
        tokenHash,
        now,
        evaluation.nextExpiresAt,
      );
      if (!touched) {
        throw new ApplicationError({
          kind: 'unauthenticated',
          code: 'SESSION_REVOKED',
          detail: 'A sessão foi encerrada. Entre novamente para continuar.',
        });
      }
    }

    return {
      principal: {
        userId: session.user.id,
        sessionId: session.id,
        email: session.user.email,
        status: session.user.status,
      },
      renewedExpiresAt: evaluation.renewed ? evaluation.nextExpiresAt : null,
    };
  }
}
