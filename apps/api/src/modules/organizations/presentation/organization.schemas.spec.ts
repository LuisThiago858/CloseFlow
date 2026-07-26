import { describe, expect, it } from 'vitest';

import {
  createOrganizationSchema,
  updateOrganizationSchema,
} from './organization.schemas';

describe('schemas HTTP de organizações', () => {
  it('normaliza NFKC e trim com a mesma regra do domínio', () => {
    expect(
      createOrganizationSchema.parse({
        name: '  CloseＦlow  ',
        slug: 'close-flow',
      }),
    ).toMatchObject({ name: 'CloseFlow' });
  });

  it('aceita 120 caracteres suplementares e recusa 121', () => {
    expect(
      updateOrganizationSchema.safeParse({ name: '😀'.repeat(120) }).success,
    ).toBe(true);
    expect(
      updateOrganizationSchema.safeParse({ name: '😀'.repeat(121) }).success,
    ).toBe(false);
  });

  it('recusa nome vazio após normalização e trim', () => {
    expect(createOrganizationSchema.safeParse({ name: '　 ' }).success).toBe(
      false,
    );
  });
});
