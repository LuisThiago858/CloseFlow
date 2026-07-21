export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verifyForLogin(
    password: string,
    passwordHash: string | null,
  ): Promise<boolean>;
}
