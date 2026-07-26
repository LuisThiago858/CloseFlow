import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CreateOrganizationPage } from './create-organization-page';
import { OrganizationContext } from './organization-context-value';

function problemResponse(errors?: Record<string, string[]>): Response {
  return new Response(
    JSON.stringify({
      type: 'https://closeflow.local/problems/http-422',
      title: 'Dados inválidos',
      status: 422,
      code: 'VALIDATION_ERROR',
      detail: 'Revise os dados informados.',
      instance: '/api/v1/organizations',
      correlationId: 'test-correlation-id',
      ...(errors === undefined ? {} : { errors }),
    }),
    {
      status: 422,
      headers: { 'Content-Type': 'application/problem+json' },
    },
  );
}

function renderPage(response: Response): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(response)),
  );
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <OrganizationContext.Provider
          value={{
            organizations: [],
            selected: null,
            selectOrganization: vi.fn(),
            removeOrganizationAccess: vi.fn(),
          }}
        >
          <CreateOrganizationPage />
        </OrganizationContext.Provider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

function submitValidValues(): void {
  fireEvent.change(screen.getByLabelText('Nome'), {
    target: { value: 'Nome preservado' },
  });
  fireEvent.change(screen.getByLabelText('Identificador'), {
    target: { value: 'slug-preservado' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Criar organização' }));
}

describe('erros do formulário de criação de organização', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('associa múltiplos erros conhecidos, preserva valores e foca o primeiro campo', async () => {
    renderPage(
      problemResponse({
        name: ['Nome recusado pelo servidor.'],
        slug: ['Slug recusado pelo servidor.'],
      }),
    );
    submitValidValues();

    const name = screen.getByLabelText('Nome');
    const slug = screen.getByLabelText('Identificador');
    expect(
      await screen.findByText('Nome recusado pelo servidor.'),
    ).toBeVisible();
    expect(screen.getByText('Slug recusado pelo servidor.')).toBeVisible();
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(slug).toHaveAttribute('aria-invalid', 'true');
    expect(name).toHaveValue('Nome preservado');
    expect(slug).toHaveValue('slug-preservado');
    expect(name).toHaveFocus();
    expect(
      screen.queryByText('Revise os dados informados.'),
    ).not.toBeInTheDocument();
  });

  it('associa errors.slug e direciona o foco ao slug', async () => {
    renderPage(problemResponse({ slug: ['Escolha outro slug.'] }));
    submitValidValues();

    expect(await screen.findByText('Escolha outro slug.')).toBeVisible();
    expect(screen.getByLabelText('Identificador')).toHaveFocus();
    expect(screen.getByLabelText('Nome')).toHaveAttribute(
      'aria-invalid',
      'false',
    );
  });

  it('ignora chave desconhecida e mantém somente o erro geral seguro', async () => {
    renderPage(problemResponse({ internalField: ['Detalhe interno.'] }));
    submitValidValues();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Revise os dados informados.',
    );
    expect(screen.queryByText('Detalhe interno.')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Nome')).toHaveValue('Nome preservado');
  });

  it('mantém erro geral quando Problem Details não possui errors', async () => {
    renderPage(problemResponse());
    submitValidValues();

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Revise os dados informados.',
      ),
    );
    expect(screen.getByLabelText('Identificador')).toHaveValue(
      'slug-preservado',
    );
  });
});
