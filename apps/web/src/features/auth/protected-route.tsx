import { useQuery } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import { Navigate } from 'react-router-dom';

import { ApiProblem } from '../../api/http-client';
import { ErrorState } from '../../components/feedback/error-state';
import { LoadingState } from '../../components/feedback/loading-state';
import { currentUserQueryOptions } from './auth-query';

export function ProtectedRoute({ children }: PropsWithChildren) {
  const currentUser = useQuery(currentUserQueryOptions);

  if (currentUser.isPending) {
    return (
      <main className="page-shell">
        <LoadingState label="Validando sua sessão" />
      </main>
    );
  }
  if (currentUser.isError) {
    if (
      currentUser.error instanceof ApiProblem &&
      currentUser.error.problem.status === 401
    ) {
      return <Navigate to="/login" replace />;
    }
    return (
      <main className="page-shell">
        <ErrorState
          message="Não foi possível validar sua sessão."
          onRetry={() => void currentUser.refetch()}
        />
      </main>
    );
  }
  return children;
}
