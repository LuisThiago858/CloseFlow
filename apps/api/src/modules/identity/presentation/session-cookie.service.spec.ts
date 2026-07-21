import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';

import type { CookieResponse } from './session-cookie.service';
import { SessionCookieService } from './session-cookie.service';

interface CookieCall {
  name: string;
  value?: string;
  options: object;
}

async function createService(nodeEnvironment: string) {
  const moduleRef = await Test.createTestingModule({
    providers: [
      SessionCookieService,
      {
        provide: ConfigService,
        useValue: {
          get: (key: string): string =>
            key === 'AUTH_COOKIE_NAME' ? 'closeflow_session' : nodeEnvironment,
        },
      },
    ],
  }).compile();
  return moduleRef.get(SessionCookieService);
}

function recordingResponse(calls: CookieCall[]): CookieResponse {
  return {
    cookie: (name, value, options) => {
      calls.push({ name, value, options });
    },
    clearCookie: (name, options) => {
      calls.push({ name, options });
    },
  };
}

describe('SessionCookieService', () => {
  it('define HttpOnly, SameSite Lax, Path e expiração alinhada', async () => {
    const service = await createService('development');
    const calls: CookieCall[] = [];
    const expiresAt = new Date(Date.now() + 60_000);
    service.set(recordingResponse(calls), 'raw-token', expiresAt);

    expect(calls[0]).toMatchObject({
      name: 'closeflow_session',
      value: 'raw-token',
      options: {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/',
        expires: expiresAt,
      },
    });
  });

  it('força Secure em produção e limpa com os mesmos atributos', async () => {
    const service = await createService('production');
    const calls: CookieCall[] = [];
    service.clear(recordingResponse(calls));

    expect(calls[0]).toEqual({
      name: 'closeflow_session',
      options: {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
      },
    });
  });
});
