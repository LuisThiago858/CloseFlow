export interface GeneratedSessionToken {
  rawToken: string;
  tokenHash: string;
}

export interface SessionTokenService {
  generate(): GeneratedSessionToken;
  hash(rawToken: string): string | null;
}
