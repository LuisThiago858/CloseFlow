import type {
  OrganizationAccess,
  StoredMembership,
  StoredOrganization,
} from '../../domain/organization.types';

export interface CreateOrganizationData {
  ownerUserId: string;
  name: string;
  slug: string;
  now: Date;
}

export interface MembershipPage {
  memberships: StoredMembership[];
  nextCursor: string | null;
}

export class DuplicateOrganizationSlugError extends Error {
  public constructor() {
    super('Organization slug already exists.');
    this.name = 'DuplicateOrganizationSlugError';
  }
}

export class OrganizationsPersistenceConflictError extends Error {
  public constructor() {
    super('Organizations persistence conflict.');
    this.name = 'OrganizationsPersistenceConflictError';
  }
}

export interface OrganizationsRepository {
  createWithOwner(data: CreateOrganizationData): Promise<OrganizationAccess>;
  listActiveForUser(
    userId: string,
    limit: number,
  ): Promise<OrganizationAccess[]>;
  resolveActiveTenant(
    userId: string,
    organizationId: string,
  ): Promise<OrganizationAccess | null>;
  findActiveOrganization(
    organizationId: string,
  ): Promise<StoredOrganization | null>;
  updateName(
    organizationId: string,
    name: string,
    now: Date,
  ): Promise<StoredOrganization | null>;
  listActiveMemberships(
    organizationId: string,
    cursor: string | null,
    limit: number,
  ): Promise<MembershipPage>;
  findMembership(
    organizationId: string,
    membershipId: string,
  ): Promise<StoredMembership | null>;
  deactivateMember(
    organizationId: string,
    membershipId: string,
    now: Date,
  ): Promise<boolean>;
  deactivateMembership(
    organizationId: string,
    membershipId: string,
    userId: string,
    now: Date,
  ): Promise<boolean>;
}
