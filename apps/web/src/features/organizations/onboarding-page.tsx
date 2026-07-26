import { Link } from 'react-router-dom';

import { useOrganizationContext } from './use-organization-context';

export function OnboardingPage() {
  const { organizations } = useOrganizationContext();
  return (
    <main className="app-content">
      <section className="content-card" aria-labelledby="onboarding-title">
        <p className="eyebrow">Primeiros passos</p>
        <h1 id="onboarding-title" className="content-title">
          Crie sua primeira organização
        </h1>
        <p>
          A organização separa os dados e define o contexto de trabalho no
          CloseFlow.
        </p>
        {organizations.length > 0 ? (
          <Link className="button-link" to="/app">
            Ir para a organização ativa
          </Link>
        ) : (
          <Link className="button-link" to="/app/organizations/new">
            Criar organização
          </Link>
        )}
      </section>
    </main>
  );
}
