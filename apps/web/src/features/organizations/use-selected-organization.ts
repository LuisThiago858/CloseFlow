import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { ApiProblem } from '../../api/http-client';
import { useOrganizationContext } from './use-organization-context';
import { organizationQueryOptions } from './organization-query';

export function useSelectedOrganization() {
  const context = useOrganizationContext();
  const organizationId = context.selected?.organization.id ?? '';
  const query = useQuery({
    ...organizationQueryOptions(organizationId),
    enabled: organizationId.length > 0,
  });
  const lostAccess =
    query.error instanceof ApiProblem && query.error.problem.status === 404;
  const refreshRequested = useRef(false);

  useEffect(() => {
    if (lostAccess && !refreshRequested.current) {
      refreshRequested.current = true;
      void context.removeOrganizationAccess(organizationId);
    } else if (!lostAccess) {
      refreshRequested.current = false;
    }
  }, [context, lostAccess, organizationId]);

  return { ...query, lostAccess };
}
