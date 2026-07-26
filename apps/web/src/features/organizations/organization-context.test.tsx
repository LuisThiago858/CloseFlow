import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { OrganizationProvider } from './organization-context';
import type { OrganizationAccess } from './organization.contracts';
import { organizationsQueryKey } from './organization-query';
import { storeOrganizationId } from './organization-selection';
import { useOrganizationContext } from './use-organization-context';

function access(id: string, name: string): OrganizationAccess {
  return {
    organization: {
      id,
      name,
      slug: name.toLowerCase().replaceAll(' ', '-'),
      status: 'ACTIVE',
      createdAt: '2026-07-22T12:00:00.000Z',
      updatedAt: '2026-07-22T12:00:00.000Z',
    },
    membership: {
      membershipId: crypto.randomUUID(),
      userId: crypto.randomUUID(),
      role: 'OWNER',
      membershipStatus: 'ACTIVE',
      joinedAt: '2026-07-22T12:00:00.000Z',
    },
  };
}

function response(accesses: readonly OrganizationAccess[]): Response {
  return new Response(JSON.stringify({ organizations: accesses }), {
    status: 200,
  });
}

function ContextProbe() {
  const context = useOrganizationContext();
  return (
    <div>
      <span data-testid="selected-organization">
        {context.selected?.organization.name ?? 'Nenhuma'}
      </span>
      <ul aria-label="Organizações elegíveis">
        {context.organizations.map(({ organization }) => (
          <li key={organization.id}>{organization.name}</li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => {
          const organizationId = context.selected?.organization.id;
          if (organizationId !== undefined) {
            void context.removeOrganizationAccess(organizationId);
          }
        }}
      >
        Simular perda de acesso
      </button>
    </div>
  );
}

function renderProvider(queryClient: QueryClient): void {
  render(
    <QueryClientProvider client={queryClient}>
      <OrganizationProvider>
        <ContextProbe />
      </OrganizationProvider>
    </QueryClientProvider>,
  );
}

describe('perda de acesso ao tenant', () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('bloqueia imediatamente o tenant revogado enquanto o refetch está atrasado', async () => {
    const revoked = access(
      '0a3411cf-da8f-4394-90bb-22ab68044ef9',
      'Alfa revogada',
    );
    const fallback = access(
      'c4b7b917-3378-4d27-85ee-fd18459bb635',
      'Beta válida',
    );
    storeOrganizationId(revoked.organization.id);
    let resolveRefetch: ((value: Response) => void) | undefined;
    const delayedRefetch = new Promise<Response>((resolve) => {
      resolveRefetch = resolve;
    });
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(response([revoked, fallback]))
        .mockReturnValueOnce(delayedRefetch),
    );
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    queryClient.setQueryData(['auth', 'me'], { id: 'user' });
    queryClient.setQueryData(['organization', revoked.organization.id], {
      organization: revoked.organization,
    });
    queryClient.setQueryData(['organization', fallback.organization.id], {
      organization: fallback.organization,
    });
    renderProvider(queryClient);

    expect(
      await screen.findByTestId('selected-organization'),
    ).toHaveTextContent('Alfa revogada');
    fireEvent.click(
      screen.getByRole('button', { name: 'Simular perda de acesso' }),
    );

    await waitFor(() =>
      expect(screen.getByTestId('selected-organization')).toHaveTextContent(
        'Beta válida',
      ),
    );
    expect(screen.queryByText('Alfa revogada')).not.toBeInTheDocument();
    expect(window.localStorage.getItem('closeflow_organization_id')).not.toBe(
      revoked.organization.id,
    );
    expect(
      queryClient.getQueryData(['organization', revoked.organization.id]),
    ).toBeUndefined();
    expect(
      queryClient.getQueryData(['organization', fallback.organization.id]),
    ).toBeDefined();
    expect(queryClient.getQueryData(['auth', 'me'])).toEqual({ id: 'user' });

    await act(async () => {
      resolveRefetch?.(response([revoked, fallback]));
      await delayedRefetch;
    });
    expect(await screen.findAllByText('Alfa revogada')).not.toHaveLength(0);
  });

  it('não recoloca o UUID revogado quando o refetch falha', async () => {
    const revoked = access(
      '0a3411cf-da8f-4394-90bb-22ab68044ef9',
      'Alfa revogada',
    );
    const fallback = access(
      'c4b7b917-3378-4d27-85ee-fd18459bb635',
      'Beta válida',
    );
    storeOrganizationId(revoked.organization.id);
    let rejectRefetch: ((reason: Error) => void) | undefined;
    const failedRefetch = new Promise<Response>((_resolve, reject) => {
      rejectRefetch = reject;
    });
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(response([revoked, fallback]))
        .mockReturnValueOnce(failedRefetch),
    );
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    renderProvider(queryClient);

    expect(
      await screen.findByTestId('selected-organization'),
    ).toHaveTextContent('Alfa revogada');
    fireEvent.click(
      screen.getByRole('button', { name: 'Simular perda de acesso' }),
    );
    await waitFor(() =>
      expect(screen.getByTestId('selected-organization')).toHaveTextContent(
        'Beta válida',
      ),
    );

    await act(async () => {
      rejectRefetch?.(new Error('falha de rede controlada'));
      await failedRefetch.catch(() => undefined);
    });
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar suas organizações.',
    );
    expect(window.localStorage.getItem('closeflow_organization_id')).not.toBe(
      revoked.organization.id,
    );
    expect(
      queryClient
        .getQueryData<OrganizationAccess[]>(organizationsQueryKey)
        ?.some(
          ({ organization }) => organization.id === revoked.organization.id,
        ),
    ).toBe(false);
  });
});
