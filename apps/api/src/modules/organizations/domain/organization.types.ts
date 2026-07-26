export const organizationStatuses = ['ACTIVE', 'INACTIVE'] as const;
export type OrganizationStatus = (typeof organizationStatuses)[number];

export const membershipRoles = ['OWNER', 'MEMBER'] as const;
export type MembershipRole = (typeof membershipRoles)[number];

export const membershipStatuses = ['ACTIVE', 'INACTIVE'] as const;
export type MembershipStatus = (typeof membershipStatuses)[number];

export interface StoredOrganization {
  id: string;
  name: string;
  slug: string;
  status: OrganizationStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoredMembership {
  id: string;
  organizationId: string;
  userId: string;
  role: MembershipRole;
  status: MembershipStatus;
  joinedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationAccess {
  organization: StoredOrganization;
  membership: StoredMembership;
}

export interface TenantContext {
  organizationId: string;
  membershipId: string;
  membershipJoinedAt: Date;
  userId: string;
  role: MembershipRole;
}

export interface PublicOrganization {
  id: string;
  name: string;
  slug: string;
  status: OrganizationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PublicMembership {
  membershipId: string;
  userId: string;
  role: MembershipRole;
  membershipStatus: MembershipStatus;
  joinedAt: string;
}

export interface PublicMember extends PublicMembership {
  email: string;
}
