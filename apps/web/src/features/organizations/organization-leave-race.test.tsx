import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MembersPage } from './members-page';
import { OnboardingPage } from './onboarding-page';
import { OrganizationProvider } from './organization-context';
import { OrganizationShell } from './organization-shell';
import type { OrganizationAccess } from './organization.contracts';
import {
  organizationQueryKey,
  organizationsQueryKey,
} from './organization-query';
import { storeOrganizationId } from './organization-selection';

function access(organizationId: string, name: string): OrganizationAccess {
  return {
    organization: {
      id: organizationId,
      name,
      slug: name.toLowerCase().replaceAll(' ', '-'),
      status: 'ACTIVE',
      createdAt: '2026-07-22T12:00:00.000Z',
      updatedAt: '2026-07-22T12:00:00.000Z',
    },
    membership: {
      membershipId: crypto.randomUUID(),
      userId: crypto.randomUUID(),
      role: 'MEMBER',
      membershipStatus: 'ACTIVE',
      joinedAt: '2026-07-22T12:00:00.000Z',
    },
  };
}

function problemResponse(): Response {
  return new Response(
    JSON.stringify({
      type: 'https://closeflow.local/problems/http-409',
      title: 'Conflito de estado',
      status: 409,
      code: 'PERSISTENCE_CONFLICT',
      detail: 'Não foi possível deixar a organização.',
      instance: '/api/v1/organizations/source/leave',
      correlationId: 'leave-test-correlation',
    }),
    {
      status: 409,
      headers: { 'Content-Type': 'application/problem+json' },
    },
  );
}

interface LeaveJourney {
  queryClient: QueryClient;
  resolveFailure(): Promise<void>;
  resolveSuccess(remaining: readonly OrganizationAccess[]): Promise<void>;
}

function renderLeaveJourney(
  accesses: readonly OrganizationAccess[],
): LeaveJourney {
  const source = accesses[0];
  if (source === undefined) {
    throw new Error('A jornada precisa de uma organização de origem.');
  }
  let availableAccesses = [...accesses];
  let resolveLeave: ((response: Response) => void) | undefined;
  const pendingLeave = new Promise<Response>((resolve) => {
    resolveLeave = resolve;
  });
  const fetchMock = vi.fn(
    (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      const method = init?.method ?? 'GET';
      if (
        method === 'GET' &&
        url.replace(/^https?:\/\/[^/]+/u, '') === '/api/v1/organizations'
      ) {
        return Promise.resolve(
          new Response(JSON.stringify({ organizations: availableAccesses }), {
            status: 200,
          }),
        );
      }
      if (method === 'GET' && url.includes('/members')) {
        return Promise.resolve(
          new Response(JSON.stringify({ members: [], nextCursor: null }), {
            status: 200,
          }),
        );
      }
      if (
        method === 'POST' &&
        url.endsWith(`/organizations/${source.organization.id}/leave`)
      ) {
        return pendingLeave;
      }
      throw new Error(`Requisição inesperada no teste: ${method} ${url}`);
    },
  );
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal(
    'confirm',
    vi.fn(() => true),
  );
  storeOrganizationId(source.organization.id);
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false, staleTime: Infinity },
    },
  });
  queryClient.setQueryData(['auth', 'me'], { id: 'global-user' });
  for (const organizationAccess of accesses) {
    queryClient.setQueryData(
      organizationQueryKey(organizationAccess.organization.id),
      { marker: organizationAccess.organization.name },
    );
  }
  const router = createMemoryRouter(
    [
      {
        path: '/app',
        element: (
          <OrganizationProvider>
            <OrganizationShell />
          </OrganizationProvider>
        ),
        children: [
          { path: 'settings/members', element: <MembersPage /> },
          { path: 'onboarding', element: <OnboardingPage /> },
        ],
      },
    ],
    { initialEntries: ['/app/settings/members'] },
  );
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );

  const resolve = async (response: Response): Promise<void> => {
    if (resolveLeave === undefined) {
      throw new Error('Resolver da saída não foi inicializado.');
    }
    const completeLeave = resolveLeave;
    await act(async () => {
      completeLeave(response);
      await pendingLeave;
    });
  };

  return {
    queryClient,
    resolveFailure: () => resolve(problemResponse()),
    resolveSuccess: async (remaining) => {
      availableAccesses = [...remaining];
      await resolve(new Response(null, { status: 204 }));
    },
  };
}

async function startLeave(): Promise<void> {
  fireEvent.click(
    await screen.findByRole('button', { name: 'Deixar organização' }),
  );
  await waitFor(() =>
    expect(fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/leave$/u),
      expect.objectContaining({ method: 'POST' }),
    ),
  );
}

async function selectOrganization(
  organization: OrganizationAccess,
): Promise<void> {
  fireEvent.change(screen.getByLabelText('Organização ativa'), {
    target: { value: organization.organization.id },
  });
  await waitFor(() =>
    expect(
      screen
        .getByLabelText('Organização ativa')
        .querySelector('option:checked'),
    ).toHaveTextContent(organization.organization.name),
  );
  expect(window.localStorage.getItem('closeflow_organization_id')).toBe(
    organization.organization.id,
  );
}

describe('saída voluntária e seleção atual do tenant', () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('preserva B quando a saída tardia de A termina após a troca de tenant', async () => {
    const organizationA = access(crypto.randomUUID(), 'Origem A');
    const organizationB = access(crypto.randomUUID(), 'Beta B');
    const organizationC = access(crypto.randomUUID(), 'Alfa C');
    const journey = renderLeaveJourney([
      organizationA,
      organizationB,
      organizationC,
    ]);

    await startLeave();
    await selectOrganization(organizationB);
    journey.queryClient.setQueryData(
      organizationQueryKey(organizationA.organization.id),
      { marker: 'stale-A' },
    );

    await journey.resolveSuccess([organizationB, organizationC]);

    await waitFor(() =>
      expect(
        screen
          .getByLabelText('Organização ativa')
          .querySelector('option:checked'),
      ).toHaveTextContent('Beta B'),
    );
    expect(window.localStorage.getItem('closeflow_organization_id')).toBe(
      organizationB.organization.id,
    );
    expect(
      screen
        .getByLabelText('Organização ativa')
        .querySelector(`option[value="${organizationA.organization.id}"]`),
    ).toBeNull();
    expect(
      journey.queryClient.getQueryData(
        organizationQueryKey(organizationA.organization.id),
      ),
    ).toBeUndefined();
    expect(
      journey.queryClient.getQueryData(
        organizationQueryKey(organizationB.organization.id),
      ),
    ).toEqual({ marker: 'Beta B' });
    expect(
      journey.queryClient.getQueryData(
        organizationQueryKey(organizationC.organization.id),
      ),
    ).toEqual({ marker: 'Alfa C' });
    expect(journey.queryClient.getQueryData(['auth', 'me'])).toEqual({
      id: 'global-user',
    });
    expect(
      journey.queryClient
        .getQueryData<OrganizationAccess[]>(organizationsQueryKey)
        ?.map(({ organization }) => organization.id),
    ).toEqual([organizationB.organization.id, organizationC.organization.id]);
  });

  it('preserva C após duas trocas enquanto a saída de A está pendente', async () => {
    const organizationA = access(crypto.randomUUID(), 'Origem A');
    const organizationB = access(crypto.randomUUID(), 'Beta B');
    const organizationC = access(crypto.randomUUID(), 'Gama C');
    const journey = renderLeaveJourney([
      organizationA,
      organizationB,
      organizationC,
    ]);

    await startLeave();
    await selectOrganization(organizationB);
    await selectOrganization(organizationC);
    await journey.resolveSuccess([organizationB, organizationC]);

    await waitFor(() =>
      expect(
        screen
          .getByLabelText('Organização ativa')
          .querySelector('option:checked'),
      ).toHaveTextContent('Gama C'),
    );
    expect(window.localStorage.getItem('closeflow_organization_id')).toBe(
      organizationC.organization.id,
    );
  });

  it('seleciona fallback quando o tenant removido ainda está ativo', async () => {
    const organizationA = access(crypto.randomUUID(), 'Origem A');
    const organizationB = access(crypto.randomUUID(), 'Beta B');
    const journey = renderLeaveJourney([organizationA, organizationB]);

    await startLeave();
    await journey.resolveSuccess([organizationB]);

    await waitFor(() =>
      expect(
        screen
          .getByLabelText('Organização ativa')
          .querySelector('option:checked'),
      ).toHaveTextContent('Beta B'),
    );
    expect(window.localStorage.getItem('closeflow_organization_id')).toBe(
      organizationB.organization.id,
    );
  });

  it('segue para onboarding quando não existe outro tenant elegível', async () => {
    const organizationA = access(crypto.randomUUID(), 'Origem A');
    const journey = renderLeaveJourney([organizationA]);

    await startLeave();
    await journey.resolveSuccess([]);

    expect(
      await screen.findByRole('heading', {
        name: 'Crie sua primeira organização',
      }),
    ).toBeInTheDocument();
    expect(window.localStorage.getItem('closeflow_organization_id')).toBeNull();
  });

  it('preserva acesso e seleção quando a mutation falha', async () => {
    const organizationA = access(crypto.randomUUID(), 'Origem A');
    const journey = renderLeaveJourney([organizationA]);

    await startLeave();
    await journey.resolveFailure();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível deixar a organização.',
    );
    expect(window.localStorage.getItem('closeflow_organization_id')).toBe(
      organizationA.organization.id,
    );
    expect(
      journey.queryClient.getQueryData(
        organizationQueryKey(organizationA.organization.id),
      ),
    ).toEqual({ marker: 'Origem A' });
    expect(
      journey.queryClient
        .getQueryData<OrganizationAccess[]>(organizationsQueryKey)
        ?.map(({ organization }) => organization.id),
    ).toEqual([organizationA.organization.id]);
  });
});
