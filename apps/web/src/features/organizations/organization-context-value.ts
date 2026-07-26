import { createContext } from 'react';

import type { OrganizationAccess } from './organization.contracts';

export interface OrganizationContextValue {
  organizations: readonly OrganizationAccess[];
  selected: OrganizationAccess | null;
  selectOrganization(organizationId: string): Promise<void>;
  removeOrganizationAccess(organizationId: string): Promise<void>;
}

export const OrganizationContext =
  createContext<OrganizationContextValue | null>(null);
