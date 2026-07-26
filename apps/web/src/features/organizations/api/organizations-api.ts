import {
  apiRequest,
  apiRequestWithoutResponse,
} from '../../../api/http-client';
import {
  type CreateOrganizationFormData,
  type OrganizationAccess,
  type PublicMember,
  type PublicOrganization,
  type UpdateOrganizationFormData,
  membersResponseSchema,
  organizationAccessSchema,
  organizationResponseSchema,
  organizationsResponseSchema,
} from '../organization.contracts';

export async function createOrganization(
  input: CreateOrganizationFormData,
): Promise<OrganizationAccess> {
  const slug = input.slug.trim();
  return apiRequest('/organizations', organizationAccessSchema, {
    method: 'POST',
    body: JSON.stringify({
      name: input.name,
      ...(slug.length === 0 ? {} : { slug }),
    }),
  });
}

export async function listOrganizations(): Promise<OrganizationAccess[]> {
  const response = await apiRequest(
    '/organizations',
    organizationsResponseSchema,
  );
  return response.organizations;
}

export async function getOrganization(
  organizationId: string,
): Promise<OrganizationAccess> {
  return apiRequest(
    `/organizations/${organizationId}`,
    organizationAccessSchema,
    { organizationId },
  );
}

export async function updateOrganization(
  organizationId: string,
  input: UpdateOrganizationFormData,
): Promise<PublicOrganization> {
  const response = await apiRequest(
    `/organizations/${organizationId}`,
    organizationResponseSchema,
    {
      method: 'PATCH',
      organizationId,
      body: JSON.stringify(input),
    },
  );
  return response.organization;
}

export async function listMembers(
  organizationId: string,
  cursor: string | null,
  limit: number,
): Promise<{ members: PublicMember[]; nextCursor: string | null }> {
  const parameters = new URLSearchParams({ limit: limit.toString() });
  if (cursor !== null) {
    parameters.set('cursor', cursor);
  }
  return apiRequest(
    `/organizations/${organizationId}/members?${parameters.toString()}`,
    membersResponseSchema,
    { organizationId },
  );
}

export async function removeMember(
  organizationId: string,
  membershipId: string,
): Promise<void> {
  await apiRequestWithoutResponse(
    `/organizations/${organizationId}/members/${membershipId}`,
    { method: 'DELETE', organizationId },
  );
}

export async function leaveOrganization(organizationId: string): Promise<void> {
  await apiRequestWithoutResponse(`/organizations/${organizationId}/leave`, {
    method: 'POST',
    organizationId,
  });
}
