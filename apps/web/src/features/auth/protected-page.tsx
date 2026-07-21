import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { ApiProblem } from '../../api/http-client';
import { authQueryKey, currentUserQueryOptions } from './auth-query';
import { logoutUser } from './api/auth-api';
import { FormError } from './form-error';

export function ProtectedPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentUser = useQuery(currentUserQueryOptions);
  const logoutMutation = useMutation({
    mutationFn: logoutUser,
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: authQueryKey });
      await navigate('/login', { replace: true });
    },
  });
  const logoutError = logoutMutation.isError
    ? logoutMutation.error instanceof ApiProblem
      ? logoutMutation.error.problem.detail
      : 'Não foi possível encerrar a sessão. Tente novamente.'
    : null;

  return (
    <main className="page-shell">
      <section className="auth-card" aria-labelledby="protected-title">
        <p className="eyebrow">Sessão autenticada</p>
        <h1 id="protected-title" className="auth-title">
          Acesso confirmado
        </h1>
        <p className="auth-copy">
          Você entrou como <strong>{currentUser.data?.email}</strong>. O
          dashboard financeiro será implementado em uma fase posterior.
        </p>
        <FormError message={logoutError} />
        <button
          type="button"
          disabled={logoutMutation.isPending}
          onClick={() => logoutMutation.mutate()}
        >
          {logoutMutation.isPending ? 'Saindo…' : 'Sair'}
        </button>
      </section>
    </main>
  );
}
