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

import {
  OrganizationContext,
  type OrganizationContextValue,
} from './organization-context-value';
import type { OrganizationAccess } from './organization.contracts';
import {
  organizationQueryKey,
  organizationsQueryKey,
} from './organization-query';
import { OrganizationSettingsPage } from './organization-settings-page';

function access(
  organizationId: string,
  organizationName: string,
  membershipId: string,
): OrganizationAccess {
  return {
    organization: {
      id: organizationId,
      name: organizationName,
      slug: organizationName.toLowerCase(),
      status: 'ACTIVE',
      createdAt: '2026-07-22T12:00:00.000Z',
      updatedAt: '2026-07-22T12:00:00.000Z',
    },
    membership: {
      membershipId,
      userId: '4df81ea4-b0e9-458c-9817-76bf63d4873c',
      role: 'OWNER',
      membershipStatus: 'ACTIVE',
      joinedAt: '2026-07-22T12:00:00.000Z',
    },
  };
}

function contextValue(
  organizations: readonly OrganizationAccess[],
  selected: OrganizationAccess,
): OrganizationContextValue {
  return {
    organizations,
    selected,
    selectOrganization: vi.fn(),
    removeOrganizationAccess: vi.fn(),
  };
}

describe('configurações da organização', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('mantém a resposta tardia vinculada ao tenant que iniciou a mutation', async () => {
    const organizationA = access(
      'c4b7b917-3378-4d27-85ee-fd18459bb635',
      'Alpha',
      'be90b692-c2fb-4b58-a1aa-ab2b9453d4a2',
    );
    const organizationB = access(
      '69a77824-f899-4d95-8fd1-a0d8c25a8e20',
      'Beta',
      'f24f9973-3879-4c8b-bd42-7c93dabf9bb2',
    );
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    });
    queryClient.setQueryData(
      organizationQueryKey(organizationA.organization.id),
      organizationA,
    );
    queryClient.setQueryData(
      organizationQueryKey(organizationB.organization.id),
      organizationB,
    );
    queryClient.setQueryData(organizationsQueryKey, [
      organizationA,
      organizationB,
    ]);
    let resolvePatch: ((response: Response) => void) | undefined;
    const pendingPatch = new Promise<Response>((resolve) => {
      resolvePatch = resolve;
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(() => pendingPatch),
    );

    const renderPage = (selected: OrganizationAccess) => (
      <QueryClientProvider client={queryClient}>
        <OrganizationContext.Provider
          value={contextValue([organizationA, organizationB], selected)}
        >
          <OrganizationSettingsPage />
        </OrganizationContext.Provider>
      </QueryClientProvider>
    );
    const view = render(renderPage(organizationA));

    fireEvent.change(screen.getByLabelText('Nome'), {
      target: { value: 'Alpha atualizada' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar nome' }));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));

    view.rerender(renderPage(organizationB));
    expect(await screen.findByDisplayValue('Beta')).toBeInTheDocument();

    const updatedOrganizationA = {
      ...organizationA.organization,
      name: 'Alpha atualizada',
      updatedAt: '2026-07-22T13:00:00.000Z',
    };
    await act(async () => {
      resolvePatch?.(
        new Response(JSON.stringify({ organization: updatedOrganizationA }), {
          status: 200,
        }),
      );
      await pendingPatch;
    });
    await waitFor(() =>
      expect(
        queryClient.getQueryData<OrganizationAccess>(
          organizationQueryKey(organizationA.organization.id),
        ),
      ).toEqual({
        organization: updatedOrganizationA,
        membership: organizationA.membership,
      }),
    );

    expect(
      queryClient.getQueryData(
        organizationQueryKey(organizationB.organization.id),
      ),
    ).toEqual(organizationB);
    expect(screen.getByDisplayValue('Beta')).toBeInTheDocument();

    view.rerender(renderPage(organizationA));
    expect(
      await screen.findByDisplayValue('Alpha atualizada'),
    ).toBeInTheDocument();
  });
});
