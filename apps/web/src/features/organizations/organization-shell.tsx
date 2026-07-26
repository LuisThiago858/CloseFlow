import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Navigate,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom';

import { logoutUser } from '../auth/api/auth-api';
import { useOrganizationContext } from './use-organization-context';
import { clearStoredOrganizationId } from './organization-selection';

export function OrganizationShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { organizations, selected, selectOrganization } =
    useOrganizationContext();
  const logout = useMutation({
    mutationFn: logoutUser,
    onSuccess: async () => {
      clearStoredOrganizationId();
      queryClient.clear();
      await navigate('/login', { replace: true });
    },
  });
  const allowsEmptyTenant =
    location.pathname === '/app/onboarding' ||
    location.pathname === '/app/organizations/new';

  if (selected === null && !allowsEmptyTenant) {
    return <Navigate to="/app/onboarding" replace />;
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <NavLink to="/app" className="brand-link">
          CloseFlow
        </NavLink>
        {organizations.length > 0 ? (
          <label className="tenant-selector">
            <span>Organização ativa</span>
            <select
              value={selected?.organization.id ?? ''}
              onChange={(event) =>
                void selectOrganization(event.currentTarget.value)
              }
            >
              {organizations.map(({ organization }) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <nav aria-label="Navegação principal" className="app-navigation">
          <NavLink to="/app">Visão geral</NavLink>
          <NavLink to="/app/settings/organization">Organização</NavLink>
          <NavLink to="/app/settings/members">Membros</NavLink>
          <NavLink to="/app/organizations/new">Nova organização</NavLink>
        </nav>
        <button
          type="button"
          className="secondary-button"
          disabled={logout.isPending}
          onClick={() => logout.mutate()}
        >
          {logout.isPending ? 'Saindo…' : 'Sair'}
        </button>
        {logout.isError ? (
          <p role="alert" className="header-error">
            Não foi possível encerrar a sessão.
          </p>
        ) : null}
      </header>
      <Outlet />
    </div>
  );
}
