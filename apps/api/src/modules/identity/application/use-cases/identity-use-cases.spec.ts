import { describe, expect, it } from 'vitest';

import { ApplicationError } from '../../../../common/errors/application-error';
import type {
  SessionRevocationReason,
  SessionWithUser,
  StoredSession,
  StoredUser,
  UserWithPassword,
} from '../../domain/identity.types';
import { SessionPolicy } from '../../domain/session-policy';
import type { Clock } from '../ports/clock';
import {
  DuplicateEmailError,
  PersistenceConflictError,
  type IdentityRepository,
  type NewSessionData,
  type NewUserData,
} from '../ports/identity.repository';
import type { PasswordHasher } from '../ports/password-hasher';
import type {
  GeneratedSessionToken,
  SessionTokenService,
} from '../ports/session-token-service';
import { AuthenticateSessionUseCase } from './authenticate-session.use-case';
import { GetCurrentUserUseCase } from './get-current-user.use-case';
import { ListSessionsUseCase } from './list-sessions.use-case';
import { LoginUserUseCase } from './login-user.use-case';
import { LogoutCurrentSessionUseCase } from './logout-current-session.use-case';
import { RegisterUserUseCase } from './register-user.use-case';
import { RevokeSessionUseCase } from './revoke-session.use-case';

const now = new Date('2026-07-17T12:00:00.000Z');
const rawToken = 'a'.repeat(43);
const tokenHash = 'b'.repeat(64);

const user = (overrides: Partial<UserWithPassword> = {}): UserWithPassword => ({
  id: '4b504f7d-0661-47d0-9833-65141a38e098',
  email: 'User@example.com',
  normalizedEmail: 'user@example.com',
  passwordHash: 'argon2id-hash',
  status: 'ACTIVE',
  createdAt: now,
  updatedAt: now,
  lastLoginAt: null,
  ...overrides,
});

class FixedClock implements Clock {
  public now(): Date {
    return now;
  }
}

class FakePasswordHasher implements PasswordHasher {
  public async hash(password: string): Promise<string> {
    void password;
    return Promise.resolve('argon2id-hash');
  }

  public async verifyForLogin(
    password: string,
    passwordHash: string | null,
  ): Promise<boolean> {
    return Promise.resolve(
      password === 'correct password' && passwordHash === 'argon2id-hash',
    );
  }
}

class FixedTokenService implements SessionTokenService {
  public generate(): GeneratedSessionToken {
    return { rawToken, tokenHash };
  }

  public hash(candidate: string): string | null {
    return candidate === rawToken ? tokenHash : null;
  }
}

class FakeIdentityRepository implements IdentityRepository {
  public existingUser: UserWithPassword | null = user();
  public currentSession: SessionWithUser | null = null;
  public sessions: StoredSession[] = [];
  public duplicateEmail = false;
  public persistenceConflict = false;
  public loginPersistenceConflict = false;
  public revokedHashes: string[] = [];
  public capturedNewUser: NewUserData | null = null;

  public async createUserWithSession(data: NewUserData): Promise<StoredUser> {
    if (this.duplicateEmail) {
      throw new DuplicateEmailError();
    }
    if (this.persistenceConflict) {
      throw new PersistenceConflictError();
    }
    this.capturedNewUser = data;
    return Promise.resolve(
      user({ email: data.email, normalizedEmail: data.normalizedEmail }),
    );
  }

  public async findUserByNormalizedEmail(): Promise<UserWithPassword | null> {
    return Promise.resolve(this.existingUser);
  }

  public async createLoginSession(
    _userId: string,
    _session: NewSessionData,
    loginAt: Date,
  ): Promise<StoredUser> {
    if (this.loginPersistenceConflict) {
      throw new PersistenceConflictError();
    }
    return Promise.resolve(user({ lastLoginAt: loginAt }));
  }

  public async findSessionByTokenHash(): Promise<SessionWithUser | null> {
    return Promise.resolve(this.currentSession);
  }

  public async touchSession(): Promise<boolean> {
    return Promise.resolve(true);
  }

  public async revokeSessionByTokenHash(
    hash: string,
    revokedAt: Date,
    reason: SessionRevocationReason,
  ): Promise<void> {
    void revokedAt;
    void reason;
    this.revokedHashes.push(hash);
  }

  public async revokeSessionById(): Promise<void> {
    return Promise.resolve();
  }

  public async findUserById(): Promise<StoredUser | null> {
    return Promise.resolve(this.existingUser);
  }

  public async listActiveSessions(): Promise<StoredSession[]> {
    return Promise.resolve(this.sessions);
  }

  public async revokeOwnedSession(
    _userId: string,
    sessionId: string,
  ): Promise<boolean> {
    return Promise.resolve(
      this.sessions.some((session) => session.id === sessionId),
    );
  }
}

const sessionPolicy = new SessionPolicy({
  ttlSeconds: 604_800,
  absoluteTtlSeconds: 2_592_000,
  renewalWindowSeconds: 86_400,
  activityIntervalSeconds: 900,
});

describe('casos de uso de identidade', () => {
  it('registra usuário e primeira sessão sem propagar senha ou token ao repositório', async () => {
    const repository = new FakeIdentityRepository();
    const useCase = new RegisterUserUseCase(
      repository,
      new FakePasswordHasher(),
      new FixedTokenService(),
      sessionPolicy,
      new FixedClock(),
    );

    const result = await useCase.execute({
      email: '  User@example.com ',
      password: 'correct password',
      passwordConfirmation: 'correct password',
    });

    expect(result.rawToken).toBe(rawToken);
    expect(result.user).not.toHaveProperty('passwordHash');
    expect(repository.capturedNewUser).toMatchObject({
      normalizedEmail: 'user@example.com',
      passwordHash: 'argon2id-hash',
      session: { tokenHash },
    });
    expect(JSON.stringify(repository.capturedNewUser)).not.toContain(rawToken);
  });

  it('mapeia e-mail duplicado para conflito público estável', async () => {
    const repository = new FakeIdentityRepository();
    repository.duplicateEmail = true;
    const useCase = new RegisterUserUseCase(
      repository,
      new FakePasswordHasher(),
      new FixedTokenService(),
      sessionPolicy,
      new FixedClock(),
    );

    await expect(
      useCase.execute({
        email: 'user@example.com',
        password: 'correct password',
        passwordConfirmation: 'correct password',
      }),
    ).rejects.toMatchObject({ code: 'EMAIL_ALREADY_REGISTERED' });
  });

  it('mapeia conflitos de persistência sem expor detalhes internos', async () => {
    const repository = new FakeIdentityRepository();
    repository.persistenceConflict = true;
    const register = new RegisterUserUseCase(
      repository,
      new FakePasswordHasher(),
      new FixedTokenService(),
      sessionPolicy,
      new FixedClock(),
    );

    await expect(
      register.execute({
        email: 'user@example.com',
        password: 'correct password',
        passwordConfirmation: 'correct password',
      }),
    ).rejects.toMatchObject({ code: 'PERSISTENCE_CONFLICT' });

    repository.persistenceConflict = false;
    repository.loginPersistenceConflict = true;
    const login = new LoginUserUseCase(
      repository,
      new FakePasswordHasher(),
      new FixedTokenService(),
      sessionPolicy,
      new FixedClock(),
    );

    await expect(
      login.execute({
        email: 'user@example.com',
        password: 'correct password',
      }),
    ).rejects.toMatchObject({ code: 'PERSISTENCE_CONFLICT' });
  });

  it('mantém credenciais inválidas indistinguíveis no login', async () => {
    const existingRepository = new FakeIdentityRepository();
    const missingRepository = new FakeIdentityRepository();
    missingRepository.existingUser = null;
    const existingLogin = new LoginUserUseCase(
      existingRepository,
      new FakePasswordHasher(),
      new FixedTokenService(),
      sessionPolicy,
      new FixedClock(),
    );
    const missingLogin = new LoginUserUseCase(
      missingRepository,
      new FakePasswordHasher(),
      new FixedTokenService(),
      sessionPolicy,
      new FixedClock(),
    );

    const outcomes = await Promise.allSettled([
      existingLogin.execute({
        email: 'user@example.com',
        password: 'wrong password',
      }),
      missingLogin.execute({
        email: 'missing@example.com',
        password: 'wrong password',
      }),
    ]);
    for (const outcome of outcomes) {
      expect(outcome.status).toBe('rejected');
      if (outcome.status === 'rejected') {
        expect(outcome.reason).toBeInstanceOf(ApplicationError);
        expect(outcome.reason).toMatchObject({
          code: 'INVALID_CREDENTIALS',
          detail: 'E-mail ou senha inválidos.',
        });
      }
    }
  });

  it('autentica sessão válida e rejeita sessão expirada', async () => {
    const repository = new FakeIdentityRepository();
    const baseSession: SessionWithUser = {
      id: '41e1a7c0-7cf9-4936-8783-91ccb236a35d',
      userId: user().id,
      tokenHash,
      createdAt: new Date('2026-07-16T12:00:00.000Z'),
      lastUsedAt: new Date('2026-07-17T11:55:00.000Z'),
      expiresAt: new Date('2026-07-18T12:00:00.000Z'),
      revokedAt: null,
      revocationReason: null,
      user: user(),
    };
    repository.currentSession = baseSession;
    const useCase = new AuthenticateSessionUseCase(
      repository,
      new FixedTokenService(),
      sessionPolicy,
      new FixedClock(),
    );
    await expect(useCase.execute(rawToken)).resolves.toMatchObject({
      principal: { userId: user().id, sessionId: baseSession.id },
    });

    repository.currentSession = {
      ...baseSession,
      expiresAt: new Date('2026-07-17T11:59:59.000Z'),
    };
    await expect(useCase.execute(rawToken)).rejects.toMatchObject({
      code: 'SESSION_EXPIRED',
    });
  });

  it('faz logout idempotente, apresenta usuário e autoriza somente sessão própria', async () => {
    const repository = new FakeIdentityRepository();
    repository.sessions = [
      {
        id: '41e1a7c0-7cf9-4936-8783-91ccb236a35d',
        userId: user().id,
        tokenHash,
        createdAt: now,
        lastUsedAt: now,
        expiresAt: new Date('2026-07-18T12:00:00.000Z'),
        revokedAt: null,
        revocationReason: null,
      },
    ];
    const logout = new LogoutCurrentSessionUseCase(
      repository,
      new FixedTokenService(),
      new FixedClock(),
    );
    await logout.execute(null);
    await logout.execute(rawToken);
    expect(repository.revokedHashes).toEqual([tokenHash]);

    await expect(
      new GetCurrentUserUseCase(repository).execute(user().id),
    ).resolves.not.toHaveProperty('passwordHash');
    await expect(
      new ListSessionsUseCase(repository, new FixedClock()).execute(
        user().id,
        repository.sessions[0]?.id ?? '',
      ),
    ).resolves.toMatchObject([{ current: true }]);

    const revoke = new RevokeSessionUseCase(repository, new FixedClock());
    await expect(
      revoke.execute(user().id, repository.sessions[0]?.id ?? '', 'unknown'),
    ).rejects.toMatchObject({ code: 'SESSION_NOT_FOUND' });
  });
});
