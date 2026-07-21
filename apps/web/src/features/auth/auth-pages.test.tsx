import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import {
  createMemoryRouter,
  RouterProvider,
  type RouteObject,
} from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LoginPage } from './login-page';
import { ProtectedPage } from './protected-page';
import { ProtectedRoute } from './protected-route';
import { RegisterPage } from './register-page';

const publicUser = {
  id: '4b504f7d-0661-47d0-9833-65141a38e098',
  email: 'user@example.com',
  status: 'ACTIVE',
  createdAt: '2026-07-17T12:00:00.000Z',
  updatedAt: '2026-07-17T12:00:00.000Z',
  lastLoginAt: null,
};

function renderRoutes(routes: RouteObject[], initialPath: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const router = createMemoryRouter(routes, { initialEntries: [initialPath] });
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

function problemResponse(
  status: number,
  code: string,
  detail: string,
): Response {
  return new Response(
    JSON.stringify({
      type: `https://closeflow.local/problems/http-${status}`,
      title: 'Falha',
      status,
      code,
      detail,
      instance: '/api/v1/auth/login',
      correlationId: 'request-id',
    }),
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  );
}

describe('fluxos mínimos de autenticação', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('faz login com credenciais incluídas e navega para a rota protegida', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ user: publicUser }), { status: 200 }),
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    renderRoutes(
      [
        { path: '/login', element: <LoginPage /> },
        { path: '/app', element: <h1>Área protegida</h1> },
      ],
      '/login',
    );

    fireEvent.change(screen.getByLabelText('E-mail'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Senha'), {
      target: { value: 'correct password' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(
      await screen.findByRole('heading', { name: 'Área protegida' }),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/auth/login',
      expect.objectContaining({ credentials: 'include', method: 'POST' }),
    );
  });

  it('mantém mensagem genérica para credenciais inválidas', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          problemResponse(
            401,
            'INVALID_CREDENTIALS',
            'E-mail ou senha inválidos.',
          ),
        ),
      ),
    );
    renderRoutes([{ path: '/login', element: <LoginPage /> }], '/login');

    fireEvent.change(screen.getByLabelText('E-mail'), {
      target: { value: 'missing@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Senha'), {
      target: { value: 'wrong password' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'E-mail ou senha inválidos.',
    );
  });

  it('valida confirmação e comprimento da senha no cadastro', async () => {
    renderRoutes(
      [{ path: '/register', element: <RegisterPage /> }],
      '/register',
    );

    fireEvent.change(screen.getByLabelText('E-mail'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Senha'), {
      target: { value: 'correct password' },
    });
    fireEvent.change(screen.getByLabelText('Confirmar senha'), {
      target: { value: 'different password' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }));

    expect(
      await screen.findByText('A confirmação deve ser igual à senha.'),
    ).toBeInTheDocument();
  });

  it('redireciona para login quando a rota protegida recebe 401', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          problemResponse(
            401,
            'UNAUTHENTICATED',
            'Uma sessão válida é necessária.',
          ),
        ),
      ),
    );
    renderRoutes(
      [
        {
          path: '/app',
          element: (
            <ProtectedRoute>
              <h1>Área protegida</h1>
            </ProtectedRoute>
          ),
        },
        { path: '/login', element: <h1>Entrar no CloseFlow</h1> },
      ],
      '/app',
    );

    expect(
      await screen.findByRole('heading', { name: 'Entrar no CloseFlow' }),
    ).toBeInTheDocument();
  });

  it('mantém a sessão visível quando o logout falha', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ user: publicUser }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        problemResponse(
          503,
          'SERVICE_UNAVAILABLE',
          'Não foi possível encerrar a sessão. Tente novamente.',
        ),
      );
    vi.stubGlobal('fetch', fetchMock);
    renderRoutes(
      [
        {
          path: '/app',
          element: (
            <ProtectedRoute>
              <ProtectedPage />
            </ProtectedRoute>
          ),
        },
        { path: '/login', element: <h1>Entrar no CloseFlow</h1> },
      ],
      '/app',
    );

    expect(
      await screen.findByRole('heading', { name: 'Acesso confirmado' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sair' }));

    expect(
      await screen.findByText(
        'Não foi possível encerrar a sessão. Tente novamente.',
      ),
    ).toHaveAttribute('role', 'alert');
    expect(
      screen.getByRole('heading', { name: 'Acesso confirmado' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Entrar no CloseFlow' }),
    ).not.toBeInTheDocument();
  });
});
