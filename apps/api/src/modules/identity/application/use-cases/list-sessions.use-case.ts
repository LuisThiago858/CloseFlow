import { Inject, Injectable } from '@nestjs/common';

import type { PublicSession } from '../../domain/identity.types';
import { CLOCK, IDENTITY_REPOSITORY } from '../identity.tokens';
import type { Clock } from '../ports/clock';
import type { IdentityRepository } from '../ports/identity.repository';
import { toPublicSession } from '../public-presenters';

@Injectable()
export class ListSessionsUseCase {
  public constructor(
    @Inject(IDENTITY_REPOSITORY)
    private readonly repository: IdentityRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  public async execute(
    userId: string,
    currentSessionId: string,
  ): Promise<PublicSession[]> {
    const sessions = await this.repository.listActiveSessions(
      userId,
      this.clock.now(),
      50,
    );
    return sessions.map((session) =>
      toPublicSession(session, currentSessionId),
    );
  }
}
