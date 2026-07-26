import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import { ApiProblem } from '../../api/http-client';
import { ErrorState } from '../../components/feedback/error-state';
import { LoadingState } from '../../components/feedback/loading-state';
import { leaveOrganization, removeMember } from './api/organizations-api';
import type { OrganizationContextValue } from './organization-context-value';
import type { OrganizationAccess } from './organization.contracts';
import { useOrganizationContext } from './use-organization-context';
import { membersQueryOptions } from './organization-query';

const membersPageSize = 50;

export function MembersPage() {
  const context = useOrganizationContext();
  const selected = context.selected;
  if (selected === null) {
    return (
      <main className="app-content">
        <LoadingState label="Carregando membros" />
      </main>
    );
  }
  return (
    <MembersForOrganization
      key={selected.organization.id}
      context={context}
      selected={selected}
    />
  );
}

function MembersForOrganization({
  context,
  selected,
}: {
  context: OrganizationContextValue;
  selected: OrganizationAccess;
}) {
  const queryClient = useQueryClient();
  const organizationId = selected.organization.id;
  const [cursors, setCursors] = useState<Array<string | null>>([null]);
  const memberPages = useQueries({
    queries: cursors.map((cursor) => ({
      ...membersQueryOptions(organizationId, cursor, membersPageSize),
      enabled: organizationId.length > 0,
    })),
  });
  const remove = useMutation({
    mutationFn: ({
      sourceOrganizationId,
      membershipId,
    }: {
      sourceOrganizationId: string;
      membershipId: string;
    }) => removeMember(sourceOrganizationId, membershipId),
    onSuccess: async (_result, { sourceOrganizationId }) => {
      await queryClient.invalidateQueries({
        queryKey: ['organization', sourceOrganizationId, 'members'],
      });
    },
  });
  const leave = useMutation({
    mutationFn: ({ sourceOrganizationId }: { sourceOrganizationId: string }) =>
      leaveOrganization(sourceOrganizationId),
    onSuccess: async (_result, { sourceOrganizationId }) => {
      await context.removeOrganizationAccess(sourceOrganizationId);
    },
  });
  const queryError = memberPages.find(({ isError }) => isError)?.error ?? null;
  const lostAccess =
    queryError instanceof ApiProblem && queryError.problem.status === 404;
  const refreshRequested = useRef(false);
  useEffect(() => {
    if (lostAccess && !refreshRequested.current) {
      refreshRequested.current = true;
      void context.removeOrganizationAccess(organizationId);
    } else if (!lostAccess) {
      refreshRequested.current = false;
    }
  }, [context, lostAccess, organizationId]);

  const firstPage = memberPages[0];
  if (firstPage === undefined || firstPage.isPending) {
    return (
      <main className="app-content">
        <LoadingState label="Carregando membros" />
      </main>
    );
  }
  if (queryError !== null) {
    if (lostAccess) {
      return (
        <main className="app-content">
          <LoadingState label="Atualizando seu acesso" />
        </main>
      );
    }
    return (
      <main className="app-content">
        <ErrorState
          message="Não foi possível carregar os membros."
          onRetry={() =>
            void Promise.all(memberPages.map((page) => page.refetch()))
          }
        />
      </main>
    );
  }
  const currentMembership = selected.membership;
  const members = (() => {
    const seen = new Set<string>();
    return memberPages.flatMap((page) =>
      (page.data?.members ?? []).filter(({ membershipId }) => {
        if (seen.has(membershipId)) {
          return false;
        }
        seen.add(membershipId);
        return true;
      }),
    );
  })();
  const lastPage = memberPages.at(-1);
  const isLoadingNextPage =
    cursors.length > 1 && (lastPage?.isPending ?? false);
  const paginationSource = isLoadingNextPage ? memberPages.at(-2) : lastPage;
  const nextCursor = paginationSource?.data?.nextCursor ?? null;
  const mutationError = remove.isError
    ? remove.error
    : leave.isError
      ? leave.error
      : null;
  const errorMessage =
    mutationError === null
      ? null
      : mutationError instanceof ApiProblem
        ? mutationError.problem.detail
        : 'Não foi possível concluir a operação.';

  return (
    <main className="app-content">
      <section className="content-card" aria-labelledby="members-title">
        <h1 id="members-title" className="content-title">
          Membros
        </h1>
        <p>Convites e reativação de memberships serão entregues na Fase 4.1.</p>
        {errorMessage === null ? null : (
          <p role="alert" className="form-alert">
            {errorMessage}
          </p>
        )}
        {members.length === 0 ? (
          <p>Nenhum membro ativo.</p>
        ) : (
          <ul className="member-list">
            {members.map((member) => (
              <li key={member.membershipId}>
                <div>
                  <strong>{member.email}</strong>
                  <span>{member.role}</span>
                </div>
                {currentMembership.role === 'OWNER' &&
                member.role === 'MEMBER' ? (
                  <button
                    type="button"
                    className="danger-button"
                    disabled={remove.isPending}
                    onClick={() => {
                      if (
                        window.confirm(
                          `Remover ${member.email} da organização?`,
                        )
                      ) {
                        remove.mutate({
                          sourceOrganizationId: organizationId,
                          membershipId: member.membershipId,
                        });
                      }
                    }}
                  >
                    Remover
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {nextCursor === null ? null : (
          <button
            type="button"
            className="secondary-button"
            aria-busy={isLoadingNextPage}
            disabled={isLoadingNextPage}
            onClick={() => {
              setCursors((current) =>
                current.includes(nextCursor)
                  ? current
                  : [...current, nextCursor],
              );
            }}
          >
            {isLoadingNextPage ? 'Carregando mais…' : 'Carregar mais'}
          </button>
        )}
        {currentMembership.role === 'MEMBER' ? (
          <button
            type="button"
            className="danger-button"
            disabled={leave.isPending}
            onClick={() => {
              if (window.confirm('Deseja deixar esta organização?')) {
                leave.mutate({ sourceOrganizationId: organizationId });
              }
            }}
          >
            Deixar organização
          </button>
        ) : null}
      </section>
    </main>
  );
}
