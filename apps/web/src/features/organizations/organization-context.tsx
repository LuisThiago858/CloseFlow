import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  type PropsWithChildren,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { ErrorState } from '../../components/feedback/error-state';
import { LoadingState } from '../../components/feedback/loading-state';
import {
  OrganizationContext,
  type OrganizationContextValue,
} from './organization-context-value';
import type { OrganizationAccess } from './organization.contracts';
import {
  organizationsQueryKey,
  organizationsQueryOptions,
} from './organization-query';
import {
  chooseOrganization,
  clearStoredOrganizationId,
  clearTenantQueries,
  readStoredOrganizationId,
  storeOrganizationId,
} from './organization-selection';

export function OrganizationProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const organizationsQuery = useQuery(organizationsQueryOptions);
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    readStoredOrganizationId(),
  );
  const selectedIdRef = useRef(selectedId);
  const [blockedOrganizationIds, setBlockedOrganizationIds] = useState<
    ReadonlySet<string>
  >(() => new Set());
  const eligibleOrganizations = useMemo(
    () =>
      (organizationsQuery.data ?? []).filter(
        ({ organization }) => !blockedOrganizationIds.has(organization.id),
      ),
    [blockedOrganizationIds, organizationsQuery.data],
  );
  const selected = useMemo(
    () => chooseOrganization(eligibleOrganizations, selectedId),
    [eligibleOrganizations, selectedId],
  );
  const resolvedOrganizationId = selected?.organization.id ?? null;
  const refetchOrganizations = organizationsQuery.refetch;

  useLayoutEffect(() => {
    if (organizationsQuery.data === undefined) {
      return;
    }
    selectedIdRef.current = resolvedOrganizationId;
    const storedOrganizationId = readStoredOrganizationId();
    if (resolvedOrganizationId === null) {
      if (storedOrganizationId !== null) {
        clearStoredOrganizationId();
      }
    } else if (storedOrganizationId !== resolvedOrganizationId) {
      storeOrganizationId(resolvedOrganizationId);
    }
  }, [organizationsQuery.data, resolvedOrganizationId]);

  const removeOrganizationAccess = useCallback(
    async (organizationId: string): Promise<void> => {
      if (selectedIdRef.current === organizationId) {
        if (readStoredOrganizationId() === organizationId) {
          clearStoredOrganizationId();
        }
        selectedIdRef.current = null;
        setSelectedId(null);
      }
      setBlockedOrganizationIds((current) => {
        const next = new Set(current);
        next.add(organizationId);
        return next;
      });
      queryClient.setQueryData<OrganizationAccess[]>(
        organizationsQueryKey,
        (current) =>
          current?.filter(
            ({ organization }) => organization.id !== organizationId,
          ),
      );
      await clearTenantQueries(queryClient, organizationId);

      const refreshed = await refetchOrganizations();
      if (
        refreshed.isSuccess &&
        refreshed.data.some(
          ({ organization }) => organization.id === organizationId,
        )
      ) {
        setBlockedOrganizationIds((current) => {
          const next = new Set(current);
          next.delete(organizationId);
          return next;
        });
      }
    },
    [queryClient, refetchOrganizations],
  );

  if (organizationsQuery.isPending) {
    return (
      <main className="page-shell">
        <LoadingState label="Carregando suas organizações" />
      </main>
    );
  }
  if (organizationsQuery.isError) {
    return (
      <main className="page-shell">
        <ErrorState
          message="Não foi possível carregar suas organizações."
          onRetry={() => void organizationsQuery.refetch()}
        />
      </main>
    );
  }

  const value: OrganizationContextValue = {
    organizations: eligibleOrganizations,
    selected,
    selectOrganization: async (organizationId) => {
      if (blockedOrganizationIds.has(organizationId)) {
        return;
      }
      const currentOrganizationId = selected?.organization.id ?? null;
      if (
        currentOrganizationId !== null &&
        currentOrganizationId !== organizationId
      ) {
        await clearTenantQueries(queryClient, currentOrganizationId);
      }
      storeOrganizationId(organizationId);
      selectedIdRef.current = organizationId;
      setSelectedId(organizationId);
    },
    removeOrganizationAccess,
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}
