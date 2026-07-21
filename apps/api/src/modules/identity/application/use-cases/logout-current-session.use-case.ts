import { Inject, Injectable } from '@nestjs/common';

import {
  CLOCK,
  IDENTITY_REPOSITORY,
  SESSION_TOKEN_SERVICE,
} from '../identity.tokens';
import type { Clock } from '../ports/clock';
import type { IdentityRepository } from '../ports/identity.repository';
import type { SessionTokenService } from '../ports/session-token-service';

@Injectable()
export class LogoutCurrentSessionUseCase {
  public constructor(
    @Inject(IDENTITY_REPOSITORY)
    private readonly repository: IdentityRepository,
    @Inject(SESSION_TOKEN_SERVICE)
    private readonly sessionTokens: SessionTokenService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  public async execute(rawToken: string | null): Promise<void> {
    if (rawToken === null) {
      return;
    }

    const tokenHash = this.sessionTokens.hash(rawToken);
    if (tokenHash === null) {
      return;
    }

    await this.repository.revokeSessionByTokenHash(
      tokenHash,
      this.clock.now(),
      'LOGOUT',
    );
  }
}
