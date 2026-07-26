import { Inject, Injectable } from '@nestjs/common';

import { IDENTITY_REPOSITORY } from './identity.tokens';
import type { IdentityRepository } from './ports/identity.repository';

export interface IdentityDirectoryUser {
  id: string;
  email: string;
}

@Injectable()
export class IdentityDirectory {
  public constructor(
    @Inject(IDENTITY_REPOSITORY)
    private readonly repository: IdentityRepository,
  ) {}

  public async findUsersByIds(
    userIds: readonly string[],
  ): Promise<IdentityDirectoryUser[]> {
    const users = await this.repository.findUsersByIds(userIds);
    return users.map(({ id, email }) => ({ id, email }));
  }
}
