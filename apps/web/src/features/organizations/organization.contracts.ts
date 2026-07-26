import { z } from 'zod';

function hasValidOrganizationNameLength(value: string): boolean {
  const normalized = value.normalize('NFKC').trim();
  const length = Array.from(normalized).length;
  return length >= 1 && length <= 120;
}

export const publicOrganizationSchema = z.object({
  id: z.uuid(),
  name: z.string().refine(hasValidOrganizationNameLength),
  slug: z.string().min(3).max(63),
  status: z.enum(['ACTIVE', 'INACTIVE']),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const publicMembershipSchema = z.object({
  membershipId: z.uuid(),
  userId: z.uuid(),
  role: z.enum(['OWNER', 'MEMBER']),
  membershipStatus: z.enum(['ACTIVE', 'INACTIVE']),
  joinedAt: z.iso.datetime(),
});

export const organizationAccessSchema = z.object({
  organization: publicOrganizationSchema,
  membership: publicMembershipSchema,
});

export const organizationsResponseSchema = z.object({
  organizations: z.array(organizationAccessSchema).max(100),
});

export const organizationResponseSchema = z.object({
  organization: publicOrganizationSchema,
});

export const publicMemberSchema = publicMembershipSchema.extend({
  email: z.string().email(),
});

export const membersResponseSchema = z.object({
  members: z.array(publicMemberSchema),
  nextCursor: z.uuid().nullable(),
});

const slugPattern = /^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$/u;
const reservedSlugs = new Set([
  'api',
  'app',
  'auth',
  'login',
  'register',
  'admin',
  'settings',
  'support',
  'www',
  'closeflow',
]);

export const createOrganizationFormSchema = z.object({
  name: z
    .string()
    .refine(
      (value) => Array.from(value.normalize('NFKC').trim()).length > 0,
      'Informe o nome.',
    )
    .refine(
      hasValidOrganizationNameLength,
      'O nome deve possuir no máximo 120 caracteres.',
    ),
  slug: z.string().refine((value) => {
    if (value.trim().length === 0) {
      return true;
    }
    const normalized = value.normalize('NFKC').trim().toLowerCase();
    return slugPattern.test(normalized) && !reservedSlugs.has(normalized);
  }, 'Use de 3 a 63 letras minúsculas, números ou hífens e evite nomes reservados.'),
});

export const updateOrganizationFormSchema = z.object({
  name: createOrganizationFormSchema.shape.name,
});

export type OrganizationAccess = z.infer<typeof organizationAccessSchema>;
export type PublicOrganization = z.infer<typeof publicOrganizationSchema>;
export type PublicMember = z.infer<typeof publicMemberSchema>;
export type CreateOrganizationFormData = z.infer<
  typeof createOrganizationFormSchema
>;
export type UpdateOrganizationFormData = z.infer<
  typeof updateOrganizationFormSchema
>;
