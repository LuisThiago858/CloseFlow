export interface NormalizedEmail {
  email: string;
  normalizedEmail: string;
}

const basicEmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

export function normalizeEmail(value: string): NormalizedEmail {
  const email = value.trim().normalize('NFKC');
  return {
    email,
    normalizedEmail: email.toLocaleLowerCase('en-US'),
  };
}

export function isValidEmail(value: string): boolean {
  const { normalizedEmail } = normalizeEmail(value);
  return (
    normalizedEmail.length > 0 &&
    normalizedEmail.length <= 254 &&
    basicEmailPattern.test(normalizedEmail)
  );
}
