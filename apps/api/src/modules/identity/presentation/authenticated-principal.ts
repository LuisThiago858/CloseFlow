import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

import { ApplicationError } from '../../../common/errors/application-error';
import type { AuthenticatedPrincipal } from '../domain/identity.types';

export const authenticatedPrincipalKey = Symbol('authenticatedPrincipal');

export type AuthenticatedRequest = Request & {
  [authenticatedPrincipalKey]?: AuthenticatedPrincipal;
};

export const CurrentPrincipal = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedPrincipal => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const principal = request[authenticatedPrincipalKey];
    if (principal === undefined) {
      throw new ApplicationError({
        kind: 'unauthenticated',
        code: 'UNAUTHENTICATED',
        detail: 'Uma sessão válida é necessária para acessar este recurso.',
      });
    }
    return principal;
  },
);
