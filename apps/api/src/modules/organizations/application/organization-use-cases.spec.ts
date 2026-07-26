import { describe, expect, it } from 'vitest';

import { ApplicationError } from '../../../common/errors/application-error';
import type { OrganizationsClock } from './ports/organizations-clock';
import {
  DuplicateOrganizationSlugError,
  OrganizationsPersistenceConflictError,
  type CreateOrganizationData,
  type MembershipPage,
  type OrganizationsRepository,
} from './ports/organizations.repository';
import {
  CreateOrganizationUseCase,
  RemoveMemberUseCase,
} from './organization-use-cases';
import type {
  OrganizationAccess,
  StoredMembership,
  StoredOrganization,
  TenantContext,
} from '../domain/organization.types';

const now = new Date('2026-07-22T12:00:00.000Z');

function organization(): StoredOrganization {
  return {
    id: '63b9f7a9-4cb2-49b5-aec7-1f8ae6c60224',
    name: 'CloseFlow BPO',
    slug: 'closeflow-bpo',
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now,
  };
}

function membership(
  role: 'OWNER' | 'MEMBER',
  status: 'ACTIVE' | 'INACTIVE' = 'ACTIVE',
): StoredMembership {
  return {
    id:
      role === 'OWNER'
        ? '5249ce72-9ef7-4bc6-8908-991a53a4a229'
        : 'bac4150d-9169-472d-adbd-c446342c92dc',
    organizationId: organization().id,
    userId: '4f69daf8-250a-4a13-8e45-1fbc66870aad',
    role,
    status,
    joinedAt: now,
    createdAt: now,
    updatedAt: now,
  };
}

class FixedClock implements OrganizationsClock {
  public now(): Date {
    return now;
  }
}

class FakeOrganizationsRepository implements OrganizationsRepository {
  public targetMembership: StoredMembership | null = membership('MEMBER');
  public deactivateCalls = 0;
  public deactivateResult = true;
  public membershipAfterDeactivate: StoredMembership | null = null;
  public duplicateSlug = false;
  public persistenceConflict = false;

  public async createWithOwner(
    data: CreateOrganizationData,
  ): Promise<OrganizationAccess> {
    if (this.duplicateSlug) {
      throw new DuplicateOrganizationSlugError();
    }
    if (this.persistenceConflict) {
      throw new OrganizationsPersistenceConflictError();
    }
    return {
      organization: { ...organization(), name: data.name, slug: data.slug },
      membership: membership('OWNER'),
    };
  }

  public async listActiveForUser(): Promise<OrganizationAccess[]> {
    return [];
  }

  public async resolveActiveTenant(): Promise<OrganizationAccess | null> {
    return null;
  }

  public async findActiveOrganization(): Promise<StoredOrganization | null> {
    return organization();
  }

  public async updateName(): Promise<StoredOrganization | null> {
    return organization();
  }

  public async listActiveMemberships(): Promise<MembershipPage> {
    return { memberships: [], nextCursor: null };
  }

  public async findMembership(): Promise<StoredMembership | null> {
    return this.targetMembership;
  }

  public async deactivateMember(): Promise<boolean> {
    this.deactivateCalls += 1;
    if (!this.deactivateResult) {
      this.targetMembership = this.membershipAfterDeactivate;
    }
    return this.deactivateResult;
  }

  public async deactivateMembership(): Promise<boolean> {
    return true;
  }
}

function tenant(role: 'OWNER' | 'MEMBER'): TenantContext {
  return {
    organizationId: organization().id,
    membershipId: membership(role).id,
    membershipJoinedAt: now,
    userId: membership(role).userId,
    role,
  };
}

describe('casos de uso de organizações', () => {
  it('cria organização ativa com owner e slug gerado', async () => {
    const repository = new FakeOrganizationsRepository();
    const useCase = new CreateOrganizationUseCase(repository, new FixedClock());
    const result = await useCase.execute({
      userId: membership('OWNER').userId,
      name: ' Escritório São José ',
    });
    expect(result).toMatchObject({
      organization: {
        name: 'Escritório São José',
        slug: 'escritorio-sao-jose',
      },
      membership: { role: 'OWNER', membershipStatus: 'ACTIVE' },
    });
  });

  it('mapeia colisão de slug sem expor detalhes de persistência', async () => {
    const repository = new FakeOrganizationsRepository();
    repository.duplicateSlug = true;
    const useCase = new CreateOrganizationUseCase(repository, new FixedClock());
    await expect(
      useCase.execute({
        userId: membership('OWNER').userId,
        name: 'Minha empresa',
        slug: 'minha-empresa',
      }),
    ).rejects.toMatchObject({
      code: 'ORGANIZATION_SLUG_CONFLICT',
      kind: 'conflict',
    });
  });

  it('sanitiza violações residuais de banco', async () => {
    const repository = new FakeOrganizationsRepository();
    repository.persistenceConflict = true;
    const useCase = new CreateOrganizationUseCase(repository, new FixedClock());
    const result = useCase.execute({
      userId: membership('OWNER').userId,
      name: 'Minha empresa',
      slug: 'minha-empresa',
    });
    await expect(result).rejects.toMatchObject({
      code: 'PERSISTENCE_CONFLICT',
      detail: 'A operação não pôde ser concluída devido a um conflito.',
    });
    await expect(result).rejects.not.toThrow(/constraint|prisma|sql/iu);
  });

  it('remove MEMBER de forma idempotente sem apagar o vínculo', async () => {
    const repository = new FakeOrganizationsRepository();
    const useCase = new RemoveMemberUseCase(repository, new FixedClock());
    await useCase.execute(tenant('OWNER'), membership('MEMBER').id);
    expect(repository.deactivateCalls).toBe(1);

    repository.targetMembership = membership('MEMBER', 'INACTIVE');
    await useCase.execute(tenant('OWNER'), membership('MEMBER').id);
    expect(repository.deactivateCalls).toBe(1);
  });

  it('classifica como sucesso a desativação concluída por chamada concorrente', async () => {
    const repository = new FakeOrganizationsRepository();
    repository.deactivateResult = false;
    repository.membershipAfterDeactivate = membership('MEMBER', 'INACTIVE');
    const useCase = new RemoveMemberUseCase(repository, new FixedClock());

    await expect(
      useCase.execute(tenant('OWNER'), membership('MEMBER').id),
    ).resolves.toBeUndefined();
    expect(repository.deactivateCalls).toBe(1);
  });

  it('mantém respostas seguras ao reclassificar update concorrente sem efeito', async () => {
    const repository = new FakeOrganizationsRepository();
    repository.deactivateResult = false;
    repository.membershipAfterDeactivate = null;
    const useCase = new RemoveMemberUseCase(repository, new FixedClock());

    await expect(
      useCase.execute(tenant('OWNER'), membership('MEMBER').id),
    ).rejects.toMatchObject({ code: 'MEMBERSHIP_NOT_FOUND' });

    repository.targetMembership = membership('MEMBER');
    repository.membershipAfterDeactivate = membership('OWNER');
    await expect(
      useCase.execute(tenant('OWNER'), membership('MEMBER').id),
    ).rejects.toMatchObject({ code: 'LAST_OWNER_REQUIRED' });
  });

  it('impede MEMBER de remover vínculo e owner de ser removido', async () => {
    const repository = new FakeOrganizationsRepository();
    const useCase = new RemoveMemberUseCase(repository, new FixedClock());
    await expect(
      useCase.execute(tenant('MEMBER'), membership('MEMBER').id),
    ).rejects.toBeInstanceOf(ApplicationError);

    repository.targetMembership = membership('OWNER');
    await expect(
      useCase.execute(tenant('OWNER'), membership('OWNER').id),
    ).rejects.toMatchObject({ code: 'LAST_OWNER_REQUIRED' });
  });
});
