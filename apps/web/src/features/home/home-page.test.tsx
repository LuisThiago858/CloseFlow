import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { HomePage } from './home-page';

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('HomePage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('exibe carregamento enquanto consulta a API', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>(() => undefined)),
    );

    renderPage();

    expect(screen.getByRole('status')).toHaveTextContent('Verificando a API');
  });

  it('informa quando a API está disponível', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              status: 'ok',
              service: 'closeflow-api',
              timestamp: '2026-07-13T00:00:00.000Z',
            }),
            { status: 200 },
          ),
        ),
      ),
    );

    renderPage();

    expect(await screen.findByText('API disponível')).toBeInTheDocument();
  });

  it('oferece nova tentativa quando a API falha', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response(null, { status: 503 }))),
    );

    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'A API está indisponível no momento.',
    );
    expect(
      screen.getByRole('button', { name: 'Tentar novamente' }),
    ).toBeEnabled();
  });
});
