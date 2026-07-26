import { useContext } from 'react';

import { OrganizationContext } from './organization-context-value';

export function useOrganizationContext() {
  const context = useContext(OrganizationContext);
  if (context === null) {
    throw new Error('OrganizationProvider não está disponível.');
  }
  return context;
}
