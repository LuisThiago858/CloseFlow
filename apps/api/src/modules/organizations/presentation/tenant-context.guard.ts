import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import { z } from 'zod';

import { ApplicationError } from '../../../common/errors/application-error';
import {
  authenticatedPrincipalKey,
  type AuthenticatedRequest,
} from '../../identity/identity.public';
import { ORGANIZATIONS_REPOSITORY } from '../application/organizations.tokens';
import type { OrganizationsRepository } from '../application/ports/organizations.repository';
import { tenantContextKey, type TenantRequest } from './tenant-context';

const organizationIdSchema = z.uuid();

@Injectable()
export class TenantContextGuard implements CanActivate {
  public constructor(
    @Inject(ORGANIZATIONS_REPOSITORY)
    private readonly repository: OrganizationsRepository,
  ) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest & TenantRequest>();
    const principal = request[authenticatedPrincipalKey];
    if (principal === undefined) {
      throw new ApplicationError({
        kind: 'unauthenticated',
        code: 'UNAUTHENTICATED',
        detail: 'Uma sessão válida é necessária para acessar este recurso.',
      });
    }

    const header = request.headers['x-organization-id'];
    if (header === undefined) {
      throw new ApplicationError({
        kind: 'bad_request',
        code: 'ORGANIZATION_CONTEXT_REQUIRED',
        detail: 'Informe o contexto da organização.',
      });
    }
    if (
      Array.isArray(header) ||
      !organizationIdSchema.safeParse(header).success
    ) {
      throw new ApplicationError({
        kind: 'validation',
        code: 'VALIDATION_ERROR',
        detail: 'Revise os dados informados.',
        errors: {
          organizationId: ['Informe um identificador de organização válido.'],
        },
      });
    }

    const routeOrganizationId: unknown = request.params.organizationId;
    if (
      typeof routeOrganizationId !== 'string' ||
      !organizationIdSchema.safeParse(routeOrganizationId).success
    ) {
      throw new ApplicationError({
        kind: 'validation',
        code: 'VALIDATION_ERROR',
        detail: 'Revise os dados informados.',
        errors: {
          organizationId: ['Informe um identificador de organização válido.'],
        },
      });
    }
    if (header !== routeOrganizationId) {
      throw this.notFound();
    }

    const access = await this.repository.resolveActiveTenant(
      principal.userId,
      header,
    );
    if (access === null) {
      throw this.notFound();
    }
    request[tenantContextKey] = {
      organizationId: access.organization.id,
      membershipId: access.membership.id,
      membershipJoinedAt: access.membership.joinedAt,
      userId: principal.userId,
      role: access.membership.role,
    };
    return true;
  }

  private notFound(): ApplicationError {
    return new ApplicationError({
      kind: 'not_found',
      code: 'ORGANIZATION_NOT_FOUND',
      detail: 'A organização não foi encontrada.',
    });
  }
}
