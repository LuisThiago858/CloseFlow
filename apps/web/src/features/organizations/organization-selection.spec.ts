import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it } from 'vitest';

import type { OrganizationAccess } from './organization.contracts';
import {
  chooseOrganization,
  clearTenantQueries,
  clearStoredOrganizationId,
  readStoredOrganizationId,
  storeOrganizationId,
} from './organization-selection';

function access(id: string, name: string): OrganizationAccess {
  return {
    organization: {
      id,
      name,
      slug: name.toLowerCase(),
      status: 'ACTIVE',
      createdAt: '2026-07-22T12:00:00.000Z',
      updatedAt: '2026-07-22T12:00:00.000Z',
    },
    membership: {
      membershipId: crypto.randomUUID(),
      userId: crypto.randomUUID(),
      role: 'OWNER',
      membershipStatus: 'ACTIVE',
      joinedAt: '2026-07-22T12:00:00.000Z',
    },
  };
}

describe('seleção e cache de organização', () => {
  beforeEach(() => window.localStorage.clear());

  it('persiste somente UUID e ignora valor inválido', () => {
    const id = crypto.randomUUID();
    storeOrganizationId(id);
    expect(readStoredOrganizationId()).toBe(id);
    expect(window.localStorage).toHaveLength(1);
    clearStoredOrganizationId();
    window.localStorage.setItem('closeflow_organization_id', 'not-a-uuid');
    expect(readStoredOrganizationId()).toBeNull();
  });

  it('preserva preferência válida e usa fallback determinístico', () => {
    const first = access(crypto.randomUUID(), 'Zeta');
    const second = access(crypto.randomUUID(), 'Alfa');
    expect(chooseOrganization([first, second], first.organization.id)).toBe(
      first,
    );
    expect(chooseOrganization([first, second], null)).toBe(second);
  });

  it('remove somente caches do tenant anterior', async () => {
    const client = new QueryClient();
    const oldId = crypto.randomUUID();
    const nextId = crypto.randomUUID();
    client.setQueryData(['auth', 'me'], { id: 'user' });
    client.setQueryData(['organizations'], []);
    client.setQueryData(['organization', oldId], { id: oldId });
    client.setQueryData(
      ['organization', oldId, 'members', { cursor: null, limit: 50 }],
      [],
    );
    client.setQueryData(
      [
        'organization',
        oldId,
        'members',
        { cursor: crypto.randomUUID(), limit: 50 },
      ],
      [],
    );
    client.setQueryData(['organization', nextId], { id: nextId });

    await clearTenantQueries(client, oldId);

    expect(client.getQueryData(['auth', 'me'])).toEqual({ id: 'user' });
    expect(client.getQueryData(['organizations'])).toEqual([]);
    expect(client.getQueryData(['organization', oldId])).toBeUndefined();
    expect(
      client.getQueriesData({
        queryKey: ['organization', oldId, 'members'],
      }),
    ).toHaveLength(0);
    expect(client.getQueryData(['organization', nextId])).toEqual({
      id: nextId,
    });
  });
});
