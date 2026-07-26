import type {
  SessionRevocationReason,
  SessionWithUser,
  StoredSession,
  StoredUser,
  UserWithPassword,
} from '../../domain/identity.types';

export interface NewSessionData {
  tokenHash: string;
  createdAt: Date;
  lastUsedAt: Date;
  expiresAt: Date;
}

export interface NewUserData {
  email: string;
  normalizedEmail: string;
  passwordHash: string;
  createdAt: Date;
  session: NewSessionData;
}

export class DuplicateEmailError extends Error {
  public constructor() {
    super('Normalized e-mail already exists.');
    this.name = 'DuplicateEmailError';
  }
}

export class InactiveUserError extends Error {
  public constructor() {
    super('User is not active.');
    this.name = 'InactiveUserError';
  }
}

export class PersistenceConflictError extends Error {
  public constructor() {
    super('Identity persistence conflict.');
    this.name = 'PersistenceConflictError';
  }
}

export interface IdentityRepository {
  createUserWithSession(data: NewUserData): Promise<StoredUser>;
  findUserByNormalizedEmail(
    normalizedEmail: string,
  ): Promise<UserWithPassword | null>;
  createLoginSession(
    userId: string,
    session: NewSessionData,
    now: Date,
  ): Promise<StoredUser>;
  findSessionByTokenHash(tokenHash: string): Promise<SessionWithUser | null>;
  touchSession(
    sessionId: string,
    tokenHash: string,
    now: Date,
    expiresAt: Date,
  ): Promise<boolean>;
  revokeSessionByTokenHash(
    tokenHash: string,
    now: Date,
    reason: SessionRevocationReason,
  ): Promise<void>;
  revokeSessionById(
    sessionId: string,
    now: Date,
    reason: SessionRevocationReason,
  ): Promise<void>;
  findUserById(userId: string): Promise<StoredUser | null>;
  findUsersByIds(userIds: readonly string[]): Promise<StoredUser[]>;
  listActiveSessions(
    userId: string,
    now: Date,
    limit: number,
  ): Promise<StoredSession[]>;
  revokeOwnedSession(
    userId: string,
    sessionId: string,
    now: Date,
  ): Promise<boolean>;
}
