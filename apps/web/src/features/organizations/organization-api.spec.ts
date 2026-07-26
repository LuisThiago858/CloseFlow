import { afterEach, describe, expect, it, vi } from 'vitest';

import { getOrganization, listOrganizations } from './api/organizations-api';

const organizationId = 'c4b7b917-3378-4d27-85ee-fd18459bb635';
const access = {
  organization: {
    id: organizationId,
    name: 'CloseFlow BPO',
    slug: 'closeflow-bpo',
    status: 'ACTIVE',
    createdAt: '2026-07-22T12:00:00.000Z',
    updatedAt: '2026-07-22T12:00:00.000Z',
  },
  membership: {
    membershipId: 'be90b692-c2fb-4b58-a1aa-ab2b9453d4a2',
    userId: '4df81ea4-b0e9-458c-9817-76bf63d4873c',
    role: 'OWNER',
    membershipStatus: 'ACTIVE',
    joinedAt: '2026-07-22T12:00:00.000Z',
  },
};

describe('cliente de organizações', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('envia o tenant somente na chamada tenant-scoped', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ organizations: [access] }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(access), { status: 200 }),
      );
    vi.stubGlobal('fetch', fetchMock);

    await listOrganizations();
    await getOrganization(organizationId);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/v1/organizations',
      expect.objectContaining({
        headers: expect.not.objectContaining({
          'X-Organization-Id': expect.any(String),
        }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      `/api/v1/organizations/${organizationId}`,
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Organization-Id': organizationId,
        }),
      }),
    );
  });
});
