export const reservedOrganizationSlugs = new Set([
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

const slugPattern = /^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$/u;

export class InvalidOrganizationSlugError extends Error {
  public constructor() {
    super('Invalid organization slug.');
    this.name = 'InvalidOrganizationSlugError';
  }
}

export function isOrganizationSlugAllowed(value: string): boolean {
  return slugPattern.test(value) && !reservedOrganizationSlugs.has(value);
}

export function normalizeOrganizationSlug(value: string): string {
  const normalized = value.normalize('NFKC').trim().toLowerCase();
  if (!isOrganizationSlugAllowed(normalized)) {
    throw new InvalidOrganizationSlugError();
  }
  return normalized;
}

export function generateOrganizationSlug(name: string): string {
  const generated = name
    .normalize('NFKD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
    .replace(/-{2,}/gu, '-')
    .slice(0, 63)
    .replace(/-+$/gu, '');
  return normalizeOrganizationSlug(generated);
}
