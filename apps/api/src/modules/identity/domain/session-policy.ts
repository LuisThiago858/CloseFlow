import type { StoredSession } from './identity.types';

export interface SessionPolicyOptions {
  ttlSeconds: number;
  absoluteTtlSeconds: number;
  renewalWindowSeconds: number;
  activityIntervalSeconds: number;
}

export type SessionEvaluation =
  | { valid: false; reason: 'expired' | 'revoked' }
  | {
      valid: true;
      shouldWrite: boolean;
      nextExpiresAt: Date;
      renewed: boolean;
    };

const secondsToMilliseconds = (seconds: number): number => seconds * 1_000;

export class SessionPolicy {
  public constructor(private readonly options: SessionPolicyOptions) {}

  public getInitialExpiration(now: Date): Date {
    return new Date(
      now.getTime() + secondsToMilliseconds(this.options.ttlSeconds),
    );
  }

  public evaluate(session: StoredSession, now: Date): SessionEvaluation {
    if (session.revokedAt !== null) {
      return { valid: false, reason: 'revoked' };
    }

    const absoluteExpiration = new Date(
      session.createdAt.getTime() +
        secondsToMilliseconds(this.options.absoluteTtlSeconds),
    );
    if (
      session.expiresAt.getTime() <= now.getTime() ||
      absoluteExpiration.getTime() <= now.getTime()
    ) {
      return { valid: false, reason: 'expired' };
    }

    const shouldTouch =
      now.getTime() - session.lastUsedAt.getTime() >=
      secondsToMilliseconds(this.options.activityIntervalSeconds);
    const insideRenewalWindow =
      session.expiresAt.getTime() - now.getTime() <=
      secondsToMilliseconds(this.options.renewalWindowSeconds);
    const proposedExpiration = Math.min(
      now.getTime() + secondsToMilliseconds(this.options.ttlSeconds),
      absoluteExpiration.getTime(),
    );
    const renewed =
      insideRenewalWindow && proposedExpiration > session.expiresAt.getTime();

    return {
      valid: true,
      shouldWrite: shouldTouch || renewed,
      nextExpiresAt: renewed ? new Date(proposedExpiration) : session.expiresAt,
      renewed,
    };
  }
}
