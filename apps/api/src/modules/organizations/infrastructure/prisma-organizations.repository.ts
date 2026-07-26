import { Inject, Injectable } from '@nestjs/common';

import { PrismaService } from '../../../shared/database/prisma.service';
import type {
  MembershipRole,
  MembershipStatus,
  OrganizationAccess,
  OrganizationStatus,
  StoredMembership,
  StoredOrganization,
} from '../domain/organization.types';
import {
  DuplicateOrganizationSlugError,
  OrganizationsPersistenceConflictError,
  type CreateOrganizationData,
  type MembershipPage,
  type OrganizationsRepository,
} from '../application/ports/organizations.repository';

interface OrganizationRow {
  id: string;
  name: string;
  slug: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

interface MembershipRow {
  id: string;
  organizationId: string;
  userId: string;
  role: string;
  status: string;
  joinedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

function toOrganizationStatus(value: string): OrganizationStatus {
  if (value === 'ACTIVE' || value === 'INACTIVE') {
    return value;
  }
  throw new OrganizationsPersistenceConflictError();
}

function toMembershipRole(value: string): MembershipRole {
  if (value === 'OWNER' || value === 'MEMBER') {
    return value;
  }
  throw new OrganizationsPersistenceConflictError();
}

function toMembershipStatus(value: string): MembershipStatus {
  if (value === 'ACTIVE' || value === 'INACTIVE') {
    return value;
  }
  throw new OrganizationsPersistenceConflictError();
}

function mapOrganization(row: OrganizationRow): StoredOrganization {
  return { ...row, status: toOrganizationStatus(row.status) };
}

function mapMembership(row: MembershipRow): StoredMembership {
  return {
    ...row,
    role: toMembershipRole(row.role),
    status: toMembershipStatus(row.status),
  };
}

function readProperty(value: unknown, property: string): unknown {
  return typeof value === 'object' && value !== null
    ? Reflect.get(value, property)
    : undefined;
}

function hasPrismaCode(error: unknown, expected: string): boolean {
  return readProperty(error, 'code') === expected;
}

function readConstraintNames(error: unknown): string[] {
  const meta = readProperty(error, 'meta');
  const target = readProperty(meta, 'target');
  const adapterError = readProperty(meta, 'driverAdapterError');
  const cause = readProperty(adapterError, 'cause');
  const constraint = readProperty(cause, 'constraint');
  const fields = readProperty(constraint, 'fields');
  const index = readProperty(constraint, 'index');
  return [
    ...(Array.isArray(target) ? target : [target]),
    ...(Array.isArray(fields) ? fields : []),
    index,
  ].filter((candidate): candidate is string => typeof candidate === 'string');
}

function isSlugConflict(error: unknown): boolean {
  return (
    hasPrismaCode(error, 'P2002') &&
    readConstraintNames(error).some((name) =>
      name.includes('organizations_slug'),
    )
  );
}

function isKnownPersistenceConflict(error: unknown): boolean {
  return ['P2002', 'P2003', 'P2004', 'P2011', 'P2034'].some((code) =>
    hasPrismaCode(error, code),
  );
}

function mapPersistenceError(error: unknown): never {
  if (isSlugConflict(error)) {
    throw new DuplicateOrganizationSlugError();
  }
  if (isKnownPersistenceConflict(error)) {
    throw new OrganizationsPersistenceConflictError();
  }
  throw error;
}

@Injectable()
export class PrismaOrganizationsRepository implements OrganizationsRepository {
  public constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  public async createWithOwner(
    data: CreateOrganizationData,
  ): Promise<OrganizationAccess> {
    try {
      return await this.prisma.$transaction(
        async (transaction) => {
          const organization = await transaction.organization.create({
            data: {
              name: data.name,
              slug: data.slug,
              status: 'ACTIVE',
              createdAt: data.now,
              updatedAt: data.now,
            },
          });
          const membership = await transaction.membership.create({
            data: {
              organizationId: organization.id,
              userId: data.ownerUserId,
              role: 'OWNER',
              status: 'ACTIVE',
              joinedAt: data.now,
              createdAt: data.now,
              updatedAt: data.now,
            },
          });
          return {
            organization: mapOrganization(organization),
            membership: mapMembership(membership),
          };
        },
        { isolationLevel: 'Serializable' },
      );
    } catch (error: unknown) {
      mapPersistenceError(error);
    }
  }

  public async listActiveForUser(
    userId: string,
    limit: number,
  ): Promise<OrganizationAccess[]> {
    const memberships = await this.prisma.membership.findMany({
      where: {
        userId,
        status: 'ACTIVE',
        organization: { status: 'ACTIVE' },
      },
      include: { organization: true },
      orderBy: [{ organization: { name: 'asc' } }, { organizationId: 'asc' }],
      take: limit,
    });
    return memberships.map((membership) => ({
      organization: mapOrganization(membership.organization),
      membership: mapMembership(membership),
    }));
  }

  public async resolveActiveTenant(
    userId: string,
    organizationId: string,
  ): Promise<OrganizationAccess | null> {
    const membership = await this.prisma.membership.findFirst({
      where: {
        userId,
        organizationId,
        status: 'ACTIVE',
        organization: { status: 'ACTIVE' },
      },
      include: { organization: true },
    });
    return membership === null
      ? null
      : {
          organization: mapOrganization(membership.organization),
          membership: mapMembership(membership),
        };
  }

  public async findActiveOrganization(
    organizationId: string,
  ): Promise<StoredOrganization | null> {
    const organization = await this.prisma.organization.findFirst({
      where: { id: organizationId, status: 'ACTIVE' },
    });
    return organization === null ? null : mapOrganization(organization);
  }

  public async updateName(
    organizationId: string,
    name: string,
    now: Date,
  ): Promise<StoredOrganization | null> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const result = await transaction.organization.updateMany({
          where: { id: organizationId, status: 'ACTIVE' },
          data: { name, updatedAt: now },
        });
        if (result.count !== 1) {
          return null;
        }
        const organization = await transaction.organization.findFirst({
          where: { id: organizationId, status: 'ACTIVE' },
        });
        return organization === null ? null : mapOrganization(organization);
      });
    } catch (error: unknown) {
      mapPersistenceError(error);
    }
  }

  public async listActiveMemberships(
    organizationId: string,
    cursor: string | null,
    limit: number,
  ): Promise<MembershipPage> {
    const rows = await this.prisma.membership.findMany({
      where: {
        organizationId,
        status: 'ACTIVE',
        ...(cursor === null ? {} : { id: { gt: cursor } }),
      },
      orderBy: { id: 'asc' },
      take: limit + 1,
    });
    const hasNextPage = rows.length > limit;
    const memberships = rows.slice(0, limit).map(mapMembership);
    return {
      memberships,
      nextCursor: hasNextPage ? (memberships.at(-1)?.id ?? null) : null,
    };
  }

  public async findMembership(
    organizationId: string,
    membershipId: string,
  ): Promise<StoredMembership | null> {
    const membership = await this.prisma.membership.findFirst({
      where: { id: membershipId, organizationId },
    });
    return membership === null ? null : mapMembership(membership);
  }

  public async deactivateMember(
    organizationId: string,
    membershipId: string,
    now: Date,
  ): Promise<boolean> {
    try {
      const result = await this.prisma.membership.updateMany({
        where: {
          id: membershipId,
          organizationId,
          role: 'MEMBER',
          status: 'ACTIVE',
        },
        data: { status: 'INACTIVE', updatedAt: now },
      });
      return result.count === 1;
    } catch (error: unknown) {
      mapPersistenceError(error);
    }
  }

  public async deactivateMembership(
    organizationId: string,
    membershipId: string,
    userId: string,
    now: Date,
  ): Promise<boolean> {
    try {
      const result = await this.prisma.membership.updateMany({
        where: {
          id: membershipId,
          organizationId,
          userId,
          role: 'MEMBER',
          status: 'ACTIVE',
        },
        data: { status: 'INACTIVE', updatedAt: now },
      });
      return result.count === 1;
    } catch (error: unknown) {
      mapPersistenceError(error);
    }
  }
}
