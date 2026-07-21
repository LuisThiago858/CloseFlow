import { describe, expect, it } from 'vitest';

import { getPasswordLength, isPasswordAllowed } from './password-policy';

describe('política de senha', () => {
  it('aceita passphrases entre 12 e 128 caracteres', () => {
    expect(isPasswordAllowed('uma frase longa e segura')).toBe(true);
    expect(isPasswordAllowed('curta')).toBe(false);
    expect(isPasswordAllowed('x'.repeat(129))).toBe(false);
  });

  it('conta caracteres Unicode sem truncar pares substitutos', () => {
    expect(getPasswordLength('🔒'.repeat(12))).toBe(12);
    expect(isPasswordAllowed('🔒'.repeat(12))).toBe(true);
  });
});
