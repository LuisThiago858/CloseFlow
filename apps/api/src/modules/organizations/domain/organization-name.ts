export const maximumOrganizationNameLength = 120;

export class InvalidOrganizationNameError extends Error {
  public constructor() {
    super('Invalid organization name.');
    this.name = 'InvalidOrganizationNameError';
  }
}

export function normalizeOrganizationName(value: string): string {
  const normalized = value.normalize('NFKC').trim();
  const length = Array.from(normalized).length;
  if (length === 0 || length > maximumOrganizationNameLength) {
    throw new InvalidOrganizationNameError();
  }
  return normalized;
}
