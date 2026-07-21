import { z } from 'zod';

const basicEmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

function isValidEmail(value: string): boolean {
  const normalizedEmail = value
    .trim()
    .normalize('NFKC')
    .toLocaleLowerCase('en-US');
  return (
    normalizedEmail.length > 0 &&
    normalizedEmail.length <= 254 &&
    basicEmailPattern.test(normalizedEmail)
  );
}

function getCharacterLength(value: string): number {
  return Array.from(value).length;
}

const emailSchema = z
  .string()
  .refine(isValidEmail, 'Informe um e-mail válido.');

const loginPasswordSchema = z
  .string()
  .refine((value) => getCharacterLength(value) > 0, 'Informe a senha.')
  .refine(
    (value) => getCharacterLength(value) <= 128,
    'A senha deve possuir no máximo 128 caracteres.',
  );

const registrationPasswordSchema = z
  .string()
  .refine(
    (value) => getCharacterLength(value) >= 12,
    'A senha deve possuir ao menos 12 caracteres.',
  )
  .refine(
    (value) => getCharacterLength(value) <= 128,
    'A senha deve possuir no máximo 128 caracteres.',
  );

export const publicUserSchema = z.object({
  id: z.uuid(),
  email: emailSchema,
  status: z.enum(['ACTIVE', 'DISABLED']),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  lastLoginAt: z.iso.datetime().nullable(),
});

export const userResponseSchema = z.object({ user: publicUserSchema });

export type PublicUser = z.infer<typeof publicUserSchema>;

export const loginFormSchema = z.object({
  email: emailSchema,
  password: loginPasswordSchema,
});

export const registerFormSchema = z
  .object({
    email: emailSchema,
    password: registrationPasswordSchema,
    passwordConfirmation: z.string(),
  })
  .refine((value) => value.password === value.passwordConfirmation, {
    path: ['passwordConfirmation'],
    message: 'A confirmação deve ser igual à senha.',
  });

export type LoginFormData = z.infer<typeof loginFormSchema>;
export type RegisterFormData = z.infer<typeof registerFormSchema>;
