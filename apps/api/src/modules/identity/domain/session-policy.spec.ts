import { describe, expect, it } from 'vitest';

import type { StoredSession } from './identity.types';
import { SessionPolicy } from './session-policy';

const policy = new SessionPolicy({
  ttlSeconds: 7 * 24 * 60 * 60,
  absoluteTtlSeconds: 30 * 24 * 60 * 60,
  renewalWindowSeconds: 24 * 60 * 60,
  activityIntervalSeconds: 15 * 60,
});

function session(overrides: Partial<StoredSession> = {}): StoredSession {
  const createdAt = new Date('2026-07-01T00:00:00.000Z');
  return {
    id: 'session-id',
    userId: 'user-id',
    tokenHash: 'a'.repeat(64),
    createdAt,
    lastUsedAt: createdAt,
    expiresAt: new Date('2026-07-08T00:00:00.000Z'),
    revokedAt: null,
    revocationReason: null,
    ...overrides,
  };
}

describe('SessionPolicy', () => {
  it('rejeita sessões expiradas e revogadas', () => {
    expect(
      policy.evaluate(session(), new Date('2026-07-08T00:00:00.000Z')),
    ).toEqual({ valid: false, reason: 'expired' });
    expect(
      policy.evaluate(
        session({ revokedAt: new Date('2026-07-02T00:00:00.000Z') }),
        new Date('2026-07-03T00:00:00.000Z'),
      ),
    ).toEqual({ valid: false, reason: 'revoked' });
  });

  it('controla atividade sem renovar fora da janela', () => {
    const evaluation = policy.evaluate(
      session(),
      new Date('2026-07-02T00:00:00.000Z'),
    );
    expect(evaluation).toMatchObject({
      valid: true,
      shouldWrite: true,
      renewed: false,
    });
  });

  it('renova perto da expiração sem ultrapassar o limite absoluto', () => {
    const evaluation = policy.evaluate(
      session({
        createdAt: new Date('2026-06-08T00:00:00.000Z'),
        lastUsedAt: new Date('2026-07-06T00:00:00.000Z'),
        expiresAt: new Date('2026-07-07T18:00:00.000Z'),
      }),
      new Date('2026-07-07T12:00:00.000Z'),
    );
    expect(evaluation).toMatchObject({ valid: true, renewed: true });
    if (evaluation.valid) {
      expect(evaluation.nextExpiresAt.toISOString()).toBe(
        '2026-07-08T00:00:00.000Z',
      );
    }
  });
});
