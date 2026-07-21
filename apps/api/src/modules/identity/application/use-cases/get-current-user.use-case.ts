import { Inject, Injectable } from '@nestjs/common';

import { ApplicationError } from '../../../../common/errors/application-error';
import type { PublicUser } from '../../domain/identity.types';
import { IDENTITY_REPOSITORY } from '../identity.tokens';
import type { IdentityRepository } from '../ports/identity.repository';
import { toPublicUser } from '../public-presenters';

@Injectable()
export class GetCurrentUserUseCase {
  public constructor(
    @Inject(IDENTITY_REPOSITORY)
    private readonly repository: IdentityRepository,
  ) {}

  public async execute(userId: string): Promise<PublicUser> {
    const user = await this.repository.findUserById(userId);
    if (user === null || user.status !== 'ACTIVE') {
      throw new ApplicationError({
        kind: 'unauthenticated',
        code: 'UNAUTHENTICATED',
        detail: 'Uma sessão válida é necessária para acessar este recurso.',
      });
    }

    return toPublicUser(user);
  }
}
