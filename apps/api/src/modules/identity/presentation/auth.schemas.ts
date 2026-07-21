import { z } from 'zod';

import { isValidEmail } from '../domain/email';
import {
  getPasswordLength,
  isPasswordAllowed,
  maximumPasswordLength,
} from '../domain/password-policy';

const emailSchema = z
  .string()
  .max(254, 'O e-mail deve possuir no máximo 254 caracteres.')
  .refine(isValidEmail, 'Informe um e-mail válido.');

export const registerRequestSchema = z
  .object({
    email: emailSchema,
    password: z
      .string()
      .refine(
        isPasswordAllowed,
        'A senha deve possuir entre 12 e 128 caracteres.',
      ),
    passwordConfirmation: z.string(),
  })
  .strict()
  .refine((value) => value.password === value.passwordConfirmation, {
    path: ['passwordConfirmation'],
    message: 'A confirmação deve ser igual à senha.',
  });

export const loginRequestSchema = z
  .object({
    email: emailSchema,
    password: z
      .string()
      .refine((value) => getPasswordLength(value) > 0, 'Informe a senha.')
      .refine(
        (value) => getPasswordLength(value) <= maximumPasswordLength,
        'A senha deve possuir no máximo 128 caracteres.',
      ),
  })
  .strict();

export const sessionIdSchema = z.uuid(
  'Informe um identificador de sessão válido.',
);

export type RegisterRequest = z.infer<typeof registerRequestSchema>;
export type LoginRequest = z.infer<typeof loginRequestSchema>;
