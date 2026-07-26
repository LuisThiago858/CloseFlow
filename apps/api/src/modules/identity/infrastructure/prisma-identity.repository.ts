import { Inject, Injectable } from '@nestjs/common';

import { PrismaService } from '../../../shared/database/prisma.service';
import type {
  SessionRevocationReason,
  SessionWithUser,
  StoredSession,
  StoredUser,
  UserStatus,
  UserWithPassword,
} from '../domain/identity.types';
import {
  DuplicateEmailError,
  InactiveUserError,
  PersistenceConflictError,
  type IdentityRepository,
  type NewSessionData,
  type NewUserData,
} from '../application/ports/identity.repository';

interface UserRow {
  id: string;
  email: string;
  normalizedEmail: string;
  passwordHash: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
}

interface SessionRow {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
  lastUsedAt: Date;
  revokedAt: Date | null;
  revocationReason: string | null;
}

function toUserStatus(status: string): UserStatus {
  if (status === 'ACTIVE' || status === 'DISABLED') {
    return status;
  }
  throw new Error('Estado de usuário persistido inválido.');
}

function mapUser(user: UserRow): UserWithPassword {
  return { ...user, status: toUserStatus(user.status) };
}

function mapPublicUser(user: UserRow): StoredUser {
  return {
    id: user.id,
    email: user.email,
    normalizedEmail: user.normalizedEmail,
    status: toUserStatus(user.status),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastLoginAt: user.lastLoginAt,
  };
}

function mapSession(session: SessionRow): StoredSession {
  return session;
}

function hasErrorCode(error: unknown, expectedCode: string): boolean {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return false;
  }
  return error.code === expectedCode;
}

function readProperty(value: unknown, property: string): unknown {
  return typeof value === 'object' && value !== null
    ? Reflect.get(value, property)
    : undefined;
}

function readConstraintNames(error: unknown): string[] {
  const meta = readProperty(error, 'meta');
  const directTarget = readProperty(meta, 'target');
  const driverAdapterError = readProperty(meta, 'driverAdapterError');
  const cause = readProperty(driverAdapterError, 'cause');
  const constraint = readProperty(cause, 'constraint');
  const constraintFields = readProperty(constraint, 'fields');
  const constraintIndex = readProperty(constraint, 'index');
  const candidates = [
    ...(Array.isArray(directTarget) ? directTarget : [directTarget]),
    ...(Array.isArray(constraintFields) ? constraintFields : []),
    constraintIndex,
  ];

  return candidates.filter(
    (candidate): candidate is string => typeof candidate === 'string',
  );
}

function hasUniqueTarget(
  error: unknown,
  expectedTargets: readonly string[],
): boolean {
  if (!hasErrorCode(error, 'P2002')) {
    return false;
  }

  return readConstraintNames(error).some((name) =>
    expectedTargets.some((expected) => name.includes(expected)),
  );
}

function isPersistenceConflict(error: unknown): boolean {
  return hasErrorCode(error, 'P2002') || hasErrorCode(error, 'P2034');
}

@Injectable()
export class PrismaIdentityRepository implements IdentityRepository {
  public constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  public async createUserWithSession(data: NewUserData): Promise<StoredUser> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const user = await transaction.user.create({
          data: {
            email: data.email,
            normalizedEmail: data.normalizedEmail,
            passwordHash: data.passwordHash,
            status: 'ACTIVE',
            createdAt: data.createdAt,
          },
        });
        await transaction.session.create({
          data: {
            userId: user.id,
            ...data.session,
          },
        });
        return mapPublicUser(user);
      });
    } catch (error: unknown) {
      if (hasUniqueTarget(error, ['normalized_email', 'normalizedEmail'])) {
        throw new DuplicateEmailError();
      }
      if (isPersistenceConflict(error)) {
        throw new PersistenceConflictError();
      }
      throw error;
    }
  }

  public async findUserByNormalizedEmail(
    normalizedEmail: string,
  ): Promise<UserWithPassword | null> {
    const user = await this.prisma.user.findUnique({
      where: { normalizedEmail },
    });
    return user === null ? null : mapUser(user);
  }

  public async createLoginSession(
    userId: string,
    session: NewSessionData,
    now: Date,
  ): Promise<StoredUser> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const update = await transaction.user.updateMany({
          where: { id: userId, status: 'ACTIVE' },
          data: { lastLoginAt: now },
        });
        if (update.count !== 1) {
          throw new InactiveUserError();
        }

        const user = await transaction.user.findUniqueOrThrow({
          where: { id: userId },
        });
        await transaction.session.create({
          data: { userId, ...session },
        });
        return mapPublicUser(user);
      });
    } catch (error: unknown) {
      if (isPersistenceConflict(error)) {
        throw new PersistenceConflictError();
      }
      throw error;
    }
  }

  public async findSessionByTokenHash(
    tokenHash: string,
  ): Promise<SessionWithUser | null> {
    const session = await this.prisma.session.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    if (session === null) {
      return null;
    }
    return { ...mapSession(session), user: mapPublicUser(session.user) };
  }

  public async touchSession(
    sessionId: string,
    tokenHash: string,
    now: Date,
    expiresAt: Date,
  ): Promise<boolean> {
    const update = await this.prisma.session.updateMany({
      where: {
        id: sessionId,
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      data: { lastUsedAt: now, expiresAt },
    });
    return update.count === 1;
  }

  public async revokeSessionByTokenHash(
    tokenHash: string,
    now: Date,
    reason: SessionRevocationReason,
  ): Promise<void> {
    await this.prisma.session.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: now, revocationReason: reason },
    });
  }

  public async revokeSessionById(
    sessionId: string,
    now: Date,
    reason: SessionRevocationReason,
  ): Promise<void> {
    await this.prisma.session.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: now, revocationReason: reason },
    });
  }

  public async findUserById(userId: string): Promise<StoredUser | null> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    return user === null ? null : mapPublicUser(user);
  }

  public async findUsersByIds(
    userIds: readonly string[],
  ): Promise<StoredUser[]> {
    if (userIds.length === 0) {
      return [];
    }
    const users = await this.prisma.user.findMany({
      where: { id: { in: [...userIds] } },
    });
    return users.map(mapPublicUser);
  }

  public async listActiveSessions(
    userId: string,
    now: Date,
    limit: number,
  ): Promise<StoredSession[]> {
    const sessions = await this.prisma.session.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: now } },
      orderBy: { lastUsedAt: 'desc' },
      take: limit,
    });
    return sessions.map(mapSession);
  }

  public async revokeOwnedSession(
    userId: string,
    sessionId: string,
    now: Date,
  ): Promise<boolean> {
    return this.prisma.$transaction(async (transaction) => {
      const ownedSession = await transaction.session.findFirst({
        where: { id: sessionId, userId },
        select: { revokedAt: true },
      });
      if (ownedSession === null) {
        return false;
      }
      if (ownedSession.revokedAt === null) {
        await transaction.session.updateMany({
          where: { id: sessionId, userId, revokedAt: null },
          data: { revokedAt: now, revocationReason: 'USER_REQUEST' },
        });
      }
      return true;
    });
  }
}
