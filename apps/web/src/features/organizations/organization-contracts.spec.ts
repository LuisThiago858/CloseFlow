import { describe, expect, it } from 'vitest';

import {
  createOrganizationFormSchema,
  publicOrganizationSchema,
} from './organization.contracts';

describe('contratos de nome de organização', () => {
  it('aceita 120 caracteres Unicode suplementares no formulário e na API', () => {
    const name = '😀'.repeat(120);
    expect(
      createOrganizationFormSchema.safeParse({ name, slug: '' }).success,
    ).toBe(true);
    expect(
      publicOrganizationSchema.safeParse({
        id: 'c4b7b917-3378-4d27-85ee-fd18459bb635',
        name,
        slug: 'nome-valido',
        status: 'ACTIVE',
        createdAt: '2026-07-22T12:00:00.000Z',
        updatedAt: '2026-07-22T12:00:00.000Z',
      }).success,
    ).toBe(true);
  });

  it('recusa 121 caracteres Unicode suplementares e nome vazio normalizado', () => {
    expect(
      createOrganizationFormSchema.safeParse({
        name: '😀'.repeat(121),
        slug: '',
      }).success,
    ).toBe(false);
    expect(
      createOrganizationFormSchema.safeParse({ name: '　 ', slug: '' }).success,
    ).toBe(false);
  });

  it('aplica a contagem após normalização NFKC', () => {
    expect(
      createOrganizationFormSchema.safeParse({
        name: `CloseＦlow${'😀'.repeat(111)}`,
        slug: '',
      }).success,
    ).toBe(true);
    expect(
      createOrganizationFormSchema.safeParse({
        name: `CloseＦlow${'😀'.repeat(112)}`,
        slug: '',
      }).success,
    ).toBe(false);
  });
});
