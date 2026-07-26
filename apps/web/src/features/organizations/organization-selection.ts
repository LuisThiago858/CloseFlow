import type { QueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import type { OrganizationAccess } from './organization.contracts';

const storageKey = 'closeflow_organization_id';

export function readStoredOrganizationId(): string | null {
  const value = window.localStorage.getItem(storageKey);
  return value !== null && z.uuid().safeParse(value).success ? value : null;
}

export function storeOrganizationId(organizationId: string): void {
  window.localStorage.setItem(storageKey, organizationId);
}

export function clearStoredOrganizationId(): void {
  window.localStorage.removeItem(storageKey);
}

export function chooseOrganization(
  accesses: readonly OrganizationAccess[],
  preferredId: string | null,
): OrganizationAccess | null {
  const preferred = accesses.find(
    ({ organization }) => organization.id === preferredId,
  );
  if (preferred !== undefined) {
    return preferred;
  }
  return (
    [...accesses].sort(
      (left, right) =>
        left.organization.name.localeCompare(
          right.organization.name,
          'pt-BR',
        ) || left.organization.id.localeCompare(right.organization.id),
    )[0] ?? null
  );
}

function isTenantQuery(queryKey: readonly unknown[], organizationId: string) {
  return queryKey[0] === 'organization' && queryKey[1] === organizationId;
}

export async function clearTenantQueries(
  queryClient: QueryClient,
  organizationId: string,
): Promise<void> {
  const predicate = ({ queryKey }: { queryKey: readonly unknown[] }) =>
    isTenantQuery(queryKey, organizationId);
  await queryClient.cancelQueries({ predicate });
  queryClient.removeQueries({ predicate });
}
