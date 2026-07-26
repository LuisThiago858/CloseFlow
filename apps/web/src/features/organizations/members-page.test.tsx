import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MembersPage } from './members-page';
import {
  OrganizationContext,
  type OrganizationContextValue,
} from './organization-context-value';
import type {
  OrganizationAccess,
  PublicMember,
} from './organization.contracts';

function access(organizationId: string, name: string): OrganizationAccess {
  return {
    organization: {
      id: organizationId,
      name,
      slug: name.toLowerCase(),
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

function member(position: number): PublicMember {
  return {
    membershipId: crypto.randomUUID(),
    userId: crypto.randomUUID(),
    email: `membro-${position}@example.com`,
    role: 'MEMBER',
    membershipStatus: 'ACTIVE',
    joinedAt: '2026-07-22T12:00:00.000Z',
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

describe('paginação de membros', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('carrega, deduplica e remove um membro além da primeira página sem misturar tenants', async () => {
    const organizationA = access(
      'c4b7b917-3378-4d27-85ee-fd18459bb635',
      'Alpha',
    );
    const organizationB = access(
      '69a77824-f899-4d95-8fd1-a0d8c25a8e20',
      'Beta',
    );
    const firstPage = Array.from({ length: 50 }, (_value, index) =>
      member(index + 1),
    );
    const member51 = member(51);
    const memberB = {
      ...member(1),
      email: 'membro-beta@example.com',
    };
    const cursor = firstPage.at(-1)?.membershipId;
    if (cursor === undefined) {
      throw new Error('Cursor de teste ausente.');
    }
    const lastFirstPageMember = firstPage.at(-1);
    if (lastFirstPageMember === undefined) {
      throw new Error('Último membro da primeira página ausente.');
    }
    let member51Removed = false;
    let secondPageDelivered = false;
    let resolveSecondPage: ((response: Response) => void) | undefined;
    const delayedSecondPage = new Promise<Response>((resolve) => {
      resolveSecondPage = resolve;
    });
    const secondPageResponse = () =>
      new Response(
        JSON.stringify({
          members: member51Removed
            ? [lastFirstPageMember]
            : [lastFirstPageMember, member51],
          nextCursor: null,
        }),
        { status: 200 },
      );
    const fetchMock = vi.fn(
      (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const url =
          typeof input === 'string'
            ? input
            : input instanceof URL
              ? input.toString()
              : input.url;
        const method = init?.method ?? 'GET';
        if (method === 'DELETE') {
          member51Removed = true;
          return Promise.resolve(new Response(null, { status: 204 }));
        }
        if (url.includes(organizationB.organization.id)) {
          return Promise.resolve(
            new Response(
              JSON.stringify({ members: [memberB], nextCursor: null }),
              { status: 200 },
            ),
          );
        }
        if (url.includes(`cursor=${cursor}`)) {
          return secondPageDelivered
            ? Promise.resolve(secondPageResponse())
            : delayedSecondPage;
        }
        return Promise.resolve(
          new Response(
            JSON.stringify({ members: firstPage, nextCursor: cursor }),
            { status: 200 },
          ),
        );
      },
    );
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal(
      'confirm',
      vi.fn(() => true),
    );
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const renderPage = (selected: OrganizationAccess) => (
      <QueryClientProvider client={queryClient}>
        <OrganizationContext.Provider
          value={contextValue([organizationA, organizationB], selected)}
        >
          <MembersPage />
        </OrganizationContext.Provider>
      </QueryClientProvider>
    );
    const view = render(renderPage(organizationA));

    expect(
      await screen.findByText('membro-50@example.com'),
    ).toBeInTheDocument();
    const loadMore = screen.getByRole('button', { name: 'Carregar mais' });
    fireEvent.click(loadMore);
    await waitFor(() => expect(loadMore).toBeDisabled());
    await act(async () => {
      secondPageDelivered = true;
      resolveSecondPage?.(secondPageResponse());
      await delayedSecondPage;
    });
    expect(await screen.findByText(member51.email)).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(51);

    const member51Item = screen.getByText(member51.email).closest('li');
    if (member51Item === null) {
      throw new Error('Item do membro 51 não encontrado.');
    }
    fireEvent.click(
      within(member51Item).getByRole('button', { name: 'Remover' }),
    );
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(
          ([input, init]) =>
            String(input).includes(member51.membershipId) &&
            init?.method === 'DELETE',
        ),
      ).toBe(true),
    );
    await waitFor(() =>
      expect(screen.queryByText(member51.email)).not.toBeInTheDocument(),
    );

    view.rerender(renderPage(organizationB));
    expect(await screen.findByText(memberB.email)).toBeInTheDocument();
    expect(screen.queryByText('membro-50@example.com')).not.toBeInTheDocument();
    const firstBetaRequest = fetchMock.mock.calls.find(([input]) =>
      String(input).includes(organizationB.organization.id),
    );
    expect(String(firstBetaRequest?.[0])).not.toContain('cursor=');
  });
});
