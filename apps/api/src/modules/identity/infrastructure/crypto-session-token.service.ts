import { createHash, randomBytes } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import type {
  GeneratedSessionToken,
  SessionTokenService,
} from '../application/ports/session-token-service';

const sessionTokenPattern = /^[A-Za-z0-9_-]{43}$/u;

@Injectable()
export class CryptoSessionTokenService implements SessionTokenService {
  public generate(): GeneratedSessionToken {
    const rawToken = randomBytes(32).toString('base64url');
    return { rawToken, tokenHash: this.hashRequired(rawToken) };
  }

  public hash(rawToken: string): string | null {
    return sessionTokenPattern.test(rawToken)
      ? this.hashRequired(rawToken)
      : null;
  }

  private hashRequired(rawToken: string): string {
    return createHash('sha256').update(rawToken, 'utf8').digest('hex');
  }
}
