import { describe, expect, it } from 'vitest';

import {
  InvalidOrganizationNameError,
  normalizeOrganizationName,
} from './organization-name';
import {
  generateOrganizationSlug,
  InvalidOrganizationSlugError,
  normalizeOrganizationSlug,
} from './organization-slug';

describe('regras básicas de organização', () => {
  it('normaliza nome com NFKC e remove espaços externos', () => {
    expect(normalizeOrganizationName('  CloseＦlow  ')).toBe('CloseFlow');
  });

  it('recusa nome vazio ou acima do limite', () => {
    expect(() => normalizeOrganizationName('   ')).toThrow(
      InvalidOrganizationNameError,
    );
    expect(() => normalizeOrganizationName('a'.repeat(121))).toThrow(
      InvalidOrganizationNameError,
    );
  });

  it('conta caracteres Unicode suplementares após normalização', () => {
    expect(normalizeOrganizationName('😀'.repeat(120))).toBe('😀'.repeat(120));
    expect(() => normalizeOrganizationName('😀'.repeat(121))).toThrow(
      InvalidOrganizationNameError,
    );
  });

  it('gera slug ASCII determinístico sem sufixo', () => {
    expect(generateOrganizationSlug('  Escritório São José  ')).toBe(
      'escritorio-sao-jose',
    );
  });

  it('normaliza slug explícito e recusa reservados ou formato inválido', () => {
    expect(normalizeOrganizationSlug(' Minha-Empresa ')).toBe('minha-empresa');
    expect(() => normalizeOrganizationSlug('admin')).toThrow(
      InvalidOrganizationSlugError,
    );
    expect(() => normalizeOrganizationSlug('área')).toThrow(
      InvalidOrganizationSlugError,
    );
  });
});
