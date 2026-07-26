import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { OnboardingPage } from './onboarding-page';
import { OrganizationProvider } from './organization-context';
import { OrganizationShell } from './organization-shell';
import { TenantHomePage } from './tenant-home-page';

describe('jornada inicial de organizações', () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('redireciona usuário sem organização para o onboarding', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify({ organizations: [] }), { status: 200 }),
        ),
      ),
    );
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
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
            { index: true, element: <TenantHomePage /> },
            { path: 'onboarding', element: <OnboardingPage /> },
          ],
        },
      ],
      { initialEntries: ['/app'] },
    );
    render(
      <QueryClientProvider client={client}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    expect(
      await screen.findByRole('heading', {
        name: 'Crie sua primeira organização',
      }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/app/onboarding');
  });
});
