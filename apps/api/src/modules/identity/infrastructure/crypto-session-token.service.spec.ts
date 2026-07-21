import { describe, expect, it } from 'vitest';

import { CryptoSessionTokenService } from './crypto-session-token.service';

describe('CryptoSessionTokenService', () => {
  it('gera token opaco de 256 bits e persiste somente SHA-256', () => {
    const service = new CryptoSessionTokenService();
    const first = service.generate();
    const second = service.generate();

    expect(first.rawToken).toMatch(/^[A-Za-z0-9_-]{43}$/u);
    expect(first.tokenHash).toMatch(/^[0-9a-f]{64}$/u);
    expect(first.tokenHash).not.toContain(first.rawToken);
    expect(first.rawToken).not.toBe(second.rawToken);
    expect(service.hash(first.rawToken)).toBe(first.tokenHash);
  });

  it('recusa tokens com formato inesperado antes de consultar o banco', () => {
    expect(new CryptoSessionTokenService().hash('token-inválido')).toBeNull();
  });
});
