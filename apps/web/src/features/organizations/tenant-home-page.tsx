import { ErrorState } from '../../components/feedback/error-state';
import { LoadingState } from '../../components/feedback/loading-state';
import { useSelectedOrganization } from './use-selected-organization';

export function TenantHomePage() {
  const organization = useSelectedOrganization();
  if (organization.isPending || organization.lostAccess) {
    return (
      <main className="app-content">
        <LoadingState label="Validando a organização ativa" />
      </main>
    );
  }
  if (organization.isError) {
    return (
      <main className="app-content">
        <ErrorState
          message="Não foi possível carregar a organização."
          onRetry={() => void organization.refetch()}
        />
      </main>
    );
  }
  return (
    <main className="app-content">
      <section className="content-card" aria-labelledby="tenant-home-title">
        <p className="eyebrow">Organização ativa</p>
        <h1 id="tenant-home-title" className="content-title">
          {organization.data.organization.name}
        </h1>
        <dl className="detail-list">
          <div>
            <dt>Identificador</dt>
            <dd>{organization.data.organization.slug}</dd>
          </div>
          <div>
            <dt>Seu papel</dt>
            <dd>{organization.data.membership.role}</dd>
          </div>
        </dl>
        <p>
          Empresas e fechamentos serão adicionados nas próximas fases do
          produto.
        </p>
      </section>
    </main>
  );
}
