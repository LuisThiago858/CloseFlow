import { Inject, Injectable } from '@nestjs/common';

import { ApplicationError } from '../../../common/errors/application-error';
import { IdentityDirectory } from '../../identity/identity.public';
import {
  InvalidOrganizationNameError,
  normalizeOrganizationName,
} from '../domain/organization-name';
import {
  generateOrganizationSlug,
  InvalidOrganizationSlugError,
  normalizeOrganizationSlug,
} from '../domain/organization-slug';
import type {
  PublicMember,
  PublicMembership,
  PublicOrganization,
  TenantContext,
} from '../domain/organization.types';
import {
  DuplicateOrganizationSlugError,
  OrganizationsPersistenceConflictError,
  type OrganizationsRepository,
} from './ports/organizations.repository';
import type { OrganizationsClock } from './ports/organizations-clock';
import {
  ORGANIZATIONS_CLOCK,
  ORGANIZATIONS_REPOSITORY,
} from './organizations.tokens';
import { toPublicMembership, toPublicOrganization } from './public-presenters';

export interface OrganizationWithMembershipResponse {
  organization: PublicOrganization;
  membership: PublicMembership;
}

export interface OrganizationListResponse {
  organizations: OrganizationWithMembershipResponse[];
}

export interface MemberListResponse {
  members: PublicMember[];
  nextCursor: string | null;
}

function validationError(field: string, message: string): ApplicationError {
  return new ApplicationError({
    kind: 'validation',
    code: 'VALIDATION_ERROR',
    detail: 'Revise os dados informados.',
    errors: { [field]: [message] },
  });
}

function mapPersistenceError(error: unknown): never {
  if (error instanceof DuplicateOrganizationSlugError) {
    throw new ApplicationError({
      kind: 'conflict',
      code: 'ORGANIZATION_SLUG_CONFLICT',
      detail: 'O identificador da organização já está em uso.',
    });
  }
  if (error instanceof OrganizationsPersistenceConflictError) {
    throw new ApplicationError({
      kind: 'conflict',
      code: 'PERSISTENCE_CONFLICT',
      detail: 'A operação não pôde ser concluída devido a um conflito.',
    });
  }
  throw error;
}

function requireOwner(tenant: TenantContext): void {
  if (tenant.role !== 'OWNER') {
    throw new ApplicationError({
      kind: 'forbidden',
      code: 'ORGANIZATION_ACCESS_DENIED',
      detail: 'Seu acesso não permite realizar esta operação.',
    });
  }
}

@Injectable()
export class CreateOrganizationUseCase {
  public constructor(
    @Inject(ORGANIZATIONS_REPOSITORY)
    private readonly repository: OrganizationsRepository,
    @Inject(ORGANIZATIONS_CLOCK)
    private readonly clock: OrganizationsClock,
  ) {}

  public async execute(input: {
    userId: string;
    name: string;
    slug?: string;
  }): Promise<OrganizationWithMembershipResponse> {
    let name: string;
    let slug: string;
    try {
      name = normalizeOrganizationName(input.name);
    } catch (error: unknown) {
      if (error instanceof InvalidOrganizationNameError) {
        throw validationError(
          'name',
          'Informe um nome com no máximo 120 caracteres.',
        );
      }
      throw error;
    }
    try {
      slug =
        input.slug === undefined
          ? generateOrganizationSlug(name)
          : normalizeOrganizationSlug(input.slug);
    } catch (error: unknown) {
      if (error instanceof InvalidOrganizationSlugError) {
        throw validationError(
          'slug',
          'Use de 3 a 63 letras minúsculas, números ou hífens e evite nomes reservados.',
        );
      }
      throw error;
    }

    try {
      const access = await this.repository.createWithOwner({
        ownerUserId: input.userId,
        name,
        slug,
        now: this.clock.now(),
      });
      return {
        organization: toPublicOrganization(access.organization),
        membership: toPublicMembership(access.membership),
      };
    } catch (error: unknown) {
      mapPersistenceError(error);
    }
  }
}

@Injectable()
export class ListOrganizationsUseCase {
  public constructor(
    @Inject(ORGANIZATIONS_REPOSITORY)
    private readonly repository: OrganizationsRepository,
  ) {}

  public async execute(userId: string): Promise<OrganizationListResponse> {
    const accesses = await this.repository.listActiveForUser(userId, 100);
    return {
      organizations: accesses.map(({ organization, membership }) => ({
        organization: toPublicOrganization(organization),
        membership: toPublicMembership(membership),
      })),
    };
  }
}

@Injectable()
export class GetOrganizationUseCase {
  public constructor(
    @Inject(ORGANIZATIONS_REPOSITORY)
    private readonly repository: OrganizationsRepository,
  ) {}

  public async execute(
    tenant: TenantContext,
  ): Promise<OrganizationWithMembershipResponse> {
    const organization = await this.repository.findActiveOrganization(
      tenant.organizationId,
    );
    if (organization === null) {
      throw new ApplicationError({
        kind: 'not_found',
        code: 'ORGANIZATION_NOT_FOUND',
        detail: 'A organização não foi encontrada.',
      });
    }
    return {
      organization: toPublicOrganization(organization),
      membership: {
        membershipId: tenant.membershipId,
        userId: tenant.userId,
        role: tenant.role,
        membershipStatus: 'ACTIVE',
        joinedAt: tenant.membershipJoinedAt.toISOString(),
      },
    };
  }
}

@Injectable()
export class UpdateOrganizationUseCase {
  public constructor(
    @Inject(ORGANIZATIONS_REPOSITORY)
    private readonly repository: OrganizationsRepository,
    @Inject(ORGANIZATIONS_CLOCK)
    private readonly clock: OrganizationsClock,
  ) {}

  public async execute(
    tenant: TenantContext,
    input: { name: string },
  ): Promise<PublicOrganization> {
    requireOwner(tenant);
    let name: string;
    try {
      name = normalizeOrganizationName(input.name);
    } catch (error: unknown) {
      if (error instanceof InvalidOrganizationNameError) {
        throw validationError(
          'name',
          'Informe um nome com no máximo 120 caracteres.',
        );
      }
      throw error;
    }
    try {
      const organization = await this.repository.updateName(
        tenant.organizationId,
        name,
        this.clock.now(),
      );
      if (organization === null) {
        throw new ApplicationError({
          kind: 'not_found',
          code: 'ORGANIZATION_NOT_FOUND',
          detail: 'A organização não foi encontrada.',
        });
      }
      return toPublicOrganization(organization);
    } catch (error: unknown) {
      mapPersistenceError(error);
    }
  }
}

@Injectable()
export class ListMembersUseCase {
  public constructor(
    @Inject(ORGANIZATIONS_REPOSITORY)
    private readonly repository: OrganizationsRepository,
    @Inject(IdentityDirectory)
    private readonly identityDirectory: IdentityDirectory,
  ) {}

  public async execute(
    tenant: TenantContext,
    cursor: string | null,
    limit: number,
  ): Promise<MemberListResponse> {
    const page = await this.repository.listActiveMemberships(
      tenant.organizationId,
      cursor,
      limit,
    );
    const identities = await this.identityDirectory.findUsersByIds(
      page.memberships.map(({ userId }) => userId),
    );
    const emailByUserId = new Map(
      identities.map(({ id, email }) => [id, email] as const),
    );
    const members = page.memberships.map((membership): PublicMember => {
      const email = emailByUserId.get(membership.userId);
      if (email === undefined) {
        throw new ApplicationError({
          kind: 'conflict',
          code: 'PERSISTENCE_CONFLICT',
          detail: 'A operação não pôde ser concluída devido a um conflito.',
        });
      }
      return { ...toPublicMembership(membership), email };
    });
    return { members, nextCursor: page.nextCursor };
  }
}

@Injectable()
export class RemoveMemberUseCase {
  public constructor(
    @Inject(ORGANIZATIONS_REPOSITORY)
    private readonly repository: OrganizationsRepository,
    @Inject(ORGANIZATIONS_CLOCK)
    private readonly clock: OrganizationsClock,
  ) {}

  public async execute(
    tenant: TenantContext,
    membershipId: string,
  ): Promise<void> {
    requireOwner(tenant);
    const membership = await this.repository.findMembership(
      tenant.organizationId,
      membershipId,
    );
    if (membership === null) {
      throw new ApplicationError({
        kind: 'not_found',
        code: 'MEMBERSHIP_NOT_FOUND',
        detail: 'O vínculo não foi encontrado.',
      });
    }
    if (membership.role === 'OWNER') {
      throw new ApplicationError({
        kind: 'conflict',
        code: 'LAST_OWNER_REQUIRED',
        detail: 'Um owner não pode ser removido nesta fase.',
      });
    }
    if (membership.status === 'INACTIVE') {
      return;
    }
    try {
      const changed = await this.repository.deactivateMember(
        tenant.organizationId,
        membershipId,
        this.clock.now(),
      );
      if (!changed) {
        const currentMembership = await this.repository.findMembership(
          tenant.organizationId,
          membershipId,
        );
        if (currentMembership === null) {
          throw new ApplicationError({
            kind: 'not_found',
            code: 'MEMBERSHIP_NOT_FOUND',
            detail: 'O vínculo não foi encontrado.',
          });
        }
        if (currentMembership.role === 'OWNER') {
          throw new ApplicationError({
            kind: 'conflict',
            code: 'LAST_OWNER_REQUIRED',
            detail: 'Um owner não pode ser removido nesta fase.',
          });
        }
        if (currentMembership.status === 'INACTIVE') {
          return;
        }
        throw new OrganizationsPersistenceConflictError();
      }
    } catch (error: unknown) {
      mapPersistenceError(error);
    }
  }
}

@Injectable()
export class LeaveOrganizationUseCase {
  public constructor(
    @Inject(ORGANIZATIONS_REPOSITORY)
    private readonly repository: OrganizationsRepository,
    @Inject(ORGANIZATIONS_CLOCK)
    private readonly clock: OrganizationsClock,
  ) {}

  public async execute(tenant: TenantContext): Promise<void> {
    if (tenant.role === 'OWNER') {
      throw new ApplicationError({
        kind: 'conflict',
        code: 'LAST_OWNER_REQUIRED',
        detail: 'Transfira a responsabilidade antes de deixar a organização.',
      });
    }
    try {
      const changed = await this.repository.deactivateMembership(
        tenant.organizationId,
        tenant.membershipId,
        tenant.userId,
        this.clock.now(),
      );
      if (!changed) {
        throw new OrganizationsPersistenceConflictError();
      }
    } catch (error: unknown) {
      mapPersistenceError(error);
    }
  }
}
