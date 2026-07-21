import { describe, expect, it } from 'vitest';

import { loginRequestSchema, registerRequestSchema } from './auth.schemas';

const email = 'user@example.com';

describe('schemas HTTP de autenticação', () => {
  it('usa a mesma contagem Unicode no cadastro e no login', () => {
    const acceptedPassword = '😀'.repeat(65);
    const rejectedPassword = '😀'.repeat(129);

    expect(
      registerRequestSchema.safeParse({
        email,
        password: acceptedPassword,
        passwordConfirmation: acceptedPassword,
      }).success,
    ).toBe(true);
    expect(
      loginRequestSchema.safeParse({ email, password: acceptedPassword })
        .success,
    ).toBe(true);
    expect(
      registerRequestSchema.safeParse({
        email,
        password: rejectedPassword,
        passwordConfirmation: rejectedPassword,
      }).success,
    ).toBe(false);
    expect(
      loginRequestSchema.safeParse({ email, password: rejectedPassword })
        .success,
    ).toBe(false);
  });
});
