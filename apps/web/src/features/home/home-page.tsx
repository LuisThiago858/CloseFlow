import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { ErrorState } from '../../components/feedback/error-state';
import { LoadingState } from '../../components/feedback/loading-state';
import { getHealth } from './api/get-health';

export function HomePage() {
  const healthQuery = useQuery({
    queryKey: ['system', 'api-health'],
    queryFn: getHealth,
  });

  return (
    <main className="page-shell">
      <section className="hero" aria-labelledby="page-title">
        <p className="eyebrow">Fundação técnica</p>
        <h1 id="page-title">CloseFlow</h1>
        <p className="hero-copy">
          Controle operacional e governança para fechamentos financeiros
          mensais.
        </p>
        <nav className="hero-actions" aria-label="Acesso à conta">
          <Link className="button-link" to="/login">
            Entrar
          </Link>
          <Link className="secondary-link" to="/register">
            Criar conta
          </Link>
        </nav>

        <div className="health-panel" aria-labelledby="health-title">
          <h2 id="health-title">Estado dos serviços</h2>
          {healthQuery.isPending ? (
            <LoadingState label="Verificando a API" />
          ) : healthQuery.isError ? (
            <ErrorState
              message="A API está indisponível no momento."
              onRetry={() => void healthQuery.refetch()}
            />
          ) : (
            <p className="status-message status-message-success" role="status">
              API disponível
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
