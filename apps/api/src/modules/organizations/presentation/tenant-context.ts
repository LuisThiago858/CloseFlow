import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

import { ApplicationError } from '../../../common/errors/application-error';
import type { TenantContext } from '../domain/organization.types';

export const tenantContextKey = Symbol('tenantContext');

export type TenantRequest = Request & {
  [tenantContextKey]?: TenantContext;
};

export const CurrentTenant = createParamDecorator(
  (_data: unknown, context: ExecutionContext): TenantContext => {
    const request = context.switchToHttp().getRequest<TenantRequest>();
    const tenant = request[tenantContextKey];
    if (tenant === undefined) {
      throw new ApplicationError({
        kind: 'not_found',
        code: 'ORGANIZATION_NOT_FOUND',
        detail: 'A organização não foi encontrada.',
      });
    }
    return tenant;
  },
);
