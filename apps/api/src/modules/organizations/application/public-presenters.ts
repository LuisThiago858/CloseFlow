import type {
  PublicMembership,
  PublicOrganization,
  StoredMembership,
  StoredOrganization,
} from '../domain/organization.types';

export function toPublicOrganization(
  organization: StoredOrganization,
): PublicOrganization {
  return {
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    status: organization.status,
    createdAt: organization.createdAt.toISOString(),
    updatedAt: organization.updatedAt.toISOString(),
  };
}

export function toPublicMembership(
  membership: StoredMembership,
): PublicMembership {
  return {
    membershipId: membership.id,
    userId: membership.userId,
    role: membership.role,
    membershipStatus: membership.status,
    joinedAt: membership.joinedAt.toISOString(),
  };
}
