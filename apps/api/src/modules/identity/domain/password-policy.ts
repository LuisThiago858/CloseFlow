export const minimumPasswordLength = 12;
export const maximumPasswordLength = 128;

export function getPasswordLength(value: string): number {
  return Array.from(value).length;
}

export function isPasswordAllowed(value: string): boolean {
  const length = getPasswordLength(value);
  return length >= minimumPasswordLength && length <= maximumPasswordLength;
}
