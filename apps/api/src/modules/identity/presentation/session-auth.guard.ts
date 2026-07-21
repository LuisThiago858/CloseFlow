import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import type { Response } from 'express';

import { ApplicationError } from '../../../common/errors/application-error';
import { AuthenticateSessionUseCase } from '../application/use-cases/authenticate-session.use-case';
import {
  authenticatedPrincipalKey,
  type AuthenticatedRequest,
} from './authenticated-principal';
import { SessionCookieService } from './session-cookie.service';

@Injectable()
export class SessionAuthGuard implements CanActivate {
  public constructor(
    @Inject(AuthenticateSessionUseCase)
    private readonly authenticateSession: AuthenticateSessionUseCase,
    @Inject(SessionCookieService)
    private readonly sessionCookie: SessionCookieService,
  ) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    const request = http.getRequest<AuthenticatedRequest>();
    const response = http.getResponse<Response>();
    const rawToken = this.sessionCookie.read(request);

    try {
      const authenticated = await this.authenticateSession.execute(rawToken);
      request[authenticatedPrincipalKey] = authenticated.principal;
      if (authenticated.renewedExpiresAt !== null && rawToken !== null) {
        this.sessionCookie.set(
          response,
          rawToken,
          authenticated.renewedExpiresAt,
        );
      }
      return true;
    } catch (error: unknown) {
      if (
        error instanceof ApplicationError &&
        error.kind === 'unauthenticated'
      ) {
        this.sessionCookie.clear(response);
      }
      throw error;
    }
  }
}
