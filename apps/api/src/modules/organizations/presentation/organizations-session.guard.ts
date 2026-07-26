import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';

import { SessionAuthGuard } from '../../identity/identity.public';

@Injectable()
export class OrganizationsSessionGuard implements CanActivate {
  public constructor(
    @Inject(SessionAuthGuard)
    private readonly sessionAuthGuard: SessionAuthGuard,
  ) {}

  public canActivate(context: ExecutionContext): Promise<boolean> {
    return this.sessionAuthGuard.canActivate(context);
  }
}
