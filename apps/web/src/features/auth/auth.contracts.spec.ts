import { describe, expect, it } from 'vitest';

import {
  loginFormSchema,
  publicUserSchema,
  registerFormSchema,
} from './auth.contracts';

describe('contratos web de autenticação', () => {
  it('aceita a mesma política de e-mail normalizado da API', () => {
    const unicodeEmail = 'usuário@exemplo.com';

    expect(
      registerFormSchema.safeParse({
        email: ` ${unicodeEmail} `,
        password: 'uma senha longa e segura',
        passwordConfirmation: 'uma senha longa e segura',
      }).success,
    ).toBe(true);
    expect(
      publicUserSchema.safeParse({
        id: '4b504f7d-0661-47d0-9833-65141a38e098',
        email: unicodeEmail,
        status: 'ACTIVE',
        createdAt: '2026-07-17T12:00:00.000Z',
        updatedAt: '2026-07-17T12:00:00.000Z',
        lastLoginAt: null,
      }).success,
    ).toBe(true);
  });

  it('conta code points Unicode nos limites de senha', () => {
    const tooShortPassword = '😀'.repeat(6);
    const acceptedPassword = '😀'.repeat(65);
    const tooLongPassword = '😀'.repeat(129);

    expect(
      registerFormSchema.safeParse({
        email: 'user@example.com',
        password: tooShortPassword,
        passwordConfirmation: tooShortPassword,
      }).success,
    ).toBe(false);
    expect(
      registerFormSchema.safeParse({
        email: 'user@example.com',
        password: acceptedPassword,
        passwordConfirmation: acceptedPassword,
      }).success,
    ).toBe(true);
    expect(
      loginFormSchema.safeParse({
        email: 'user@example.com',
        password: acceptedPassword,
      }).success,
    ).toBe(true);
    expect(
      loginFormSchema.safeParse({
        email: 'user@example.com',
        password: tooLongPassword,
      }).success,
    ).toBe(false);
  });
});
