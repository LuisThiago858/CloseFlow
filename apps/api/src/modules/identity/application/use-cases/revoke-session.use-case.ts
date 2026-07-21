import { Inject, Injectable } from '@nestjs/common';

import { ApplicationError } from '../../../../common/errors/application-error';
import { CLOCK, IDENTITY_REPOSITORY } from '../identity.tokens';
import type { Clock } from '../ports/clock';
import type { IdentityRepository } from '../ports/identity.repository';

export interface RevokeSessionResult {
  revokedCurrentSession: boolean;
}

@Injectable()
export class RevokeSessionUseCase {
  public constructor(
    @Inject(IDENTITY_REPOSITORY)
    private readonly repository: IdentityRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  public async execute(
    userId: string,
    currentSessionId: string,
    sessionId: string,
  ): Promise<RevokeSessionResult> {
    const owned = await this.repository.revokeOwnedSession(
      userId,
      sessionId,
      this.clock.now(),
    );
    if (!owned) {
      throw new ApplicationError({
        kind: 'not_found',
        code: 'SESSION_NOT_FOUND',
        detail: 'A sessão informada não foi encontrada.',
      });
    }

    return { revokedCurrentSession: sessionId === currentSessionId };
  }
}
