import { queryOptions } from '@tanstack/react-query';

import {
  getOrganization,
  listMembers,
  listOrganizations,
} from './api/organizations-api';

export const organizationsQueryKey = ['organizations'] as const;

export const organizationsQueryOptions = queryOptions({
  queryKey: organizationsQueryKey,
  queryFn: listOrganizations,
  retry: false,
});

export function organizationQueryKey(organizationId: string) {
  return ['organization', organizationId] as const;
}

export function organizationQueryOptions(organizationId: string) {
  return queryOptions({
    queryKey: organizationQueryKey(organizationId),
    queryFn: () => getOrganization(organizationId),
    retry: false,
  });
}

export function membersQueryKey(
  organizationId: string,
  cursor: string | null,
  limit: number,
) {
  return [
    'organization',
    organizationId,
    'members',
    { cursor, limit },
  ] as const;
}

export function membersQueryOptions(
  organizationId: string,
  cursor: string | null,
  limit: number,
) {
  return queryOptions({
    queryKey: membersQueryKey(organizationId, cursor, limit),
    queryFn: () => listMembers(organizationId, cursor, limit),
    retry: false,
  });
}
