export const userStatuses = ['ACTIVE', 'DISABLED'] as const;
export type UserStatus = (typeof userStatuses)[number];

export const sessionRevocationReasons = [
  'LOGOUT',
  'USER_REQUEST',
  'USER_DISABLED',
] as const;
export type SessionRevocationReason = (typeof sessionRevocationReasons)[number];

export interface StoredUser {
  id: string;
  email: string;
  normalizedEmail: string;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
}

export interface UserWithPassword extends StoredUser {
  passwordHash: string;
}

export interface PublicUser {
  id: string;
  email: string;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}

export interface StoredSession {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
  lastUsedAt: Date;
  revokedAt: Date | null;
  revocationReason: string | null;
}

export interface SessionWithUser extends StoredSession {
  user: StoredUser;
}

export interface AuthenticatedPrincipal {
  userId: string;
  sessionId: string;
  email: string;
  status: UserStatus;
}

export interface PublicSession {
  id: string;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  current: boolean;
}
