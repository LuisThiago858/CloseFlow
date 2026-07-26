import { z } from 'zod';

import {
  InvalidOrganizationNameError,
  normalizeOrganizationName,
} from '../domain/organization-name';
import { isOrganizationSlugAllowed } from '../domain/organization-slug';

const nameSchema = z.string().transform((value, context) => {
  try {
    return normalizeOrganizationName(value);
  } catch (error: unknown) {
    if (error instanceof InvalidOrganizationNameError) {
      context.addIssue({
        code: 'custom',
        message: 'Informe um nome com no máximo 120 caracteres.',
      });
      return z.NEVER;
    }
    throw error;
  }
});

const slugSchema = z
  .string()
  .refine(
    (value) =>
      isOrganizationSlugAllowed(value.normalize('NFKC').trim().toLowerCase()),
    'Use de 3 a 63 letras minúsculas, números ou hífens e evite nomes reservados.',
  );

export const createOrganizationSchema = z
  .object({ name: nameSchema, slug: slugSchema.optional() })
  .strict();

export const updateOrganizationSchema = z.object({ name: nameSchema }).strict();

export const organizationIdSchema = z.uuid(
  'Informe um identificador de organização válido.',
);

export const membershipIdSchema = z.uuid(
  'Informe um identificador de vínculo válido.',
);

export const membersQuerySchema = z
  .object({
    cursor: z.uuid('Informe um cursor válido.').optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  })
  .strict();

export type CreateOrganizationRequest = z.infer<
  typeof createOrganizationSchema
>;
export type UpdateOrganizationRequest = z.infer<
  typeof updateOrganizationSchema
>;
export type MembersQuery = z.infer<typeof membersQuerySchema>;
