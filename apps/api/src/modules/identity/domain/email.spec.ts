import { describe, expect, it } from 'vitest';

import { isValidEmail, normalizeEmail } from './email';

describe('e-mail de autenticação', () => {
  it('remove espaços, aplica NFKC e normaliza a caixa', () => {
    expect(normalizeEmail('  UsEr@ExAmPle.COM  ')).toEqual({
      email: 'UsEr@ExAmPle.COM',
      normalizedEmail: 'user@example.com',
    });
    expect(normalizeEmail('ｕｓｅｒ@example.com').normalizedEmail).toBe(
      'user@example.com',
    );
  });

  it('rejeita formato inválido e e-mail acima do limite', () => {
    expect(isValidEmail('sem-arroba')).toBe(false);
    expect(isValidEmail(`${'a'.repeat(250)}@example.com`)).toBe(false);
  });
});
