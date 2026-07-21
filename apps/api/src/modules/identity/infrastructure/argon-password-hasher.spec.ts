import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';

import { ArgonPasswordHasher } from './argon-password-hasher';

describe('ArgonPasswordHasher', () => {
  it('gera Argon2id com parâmetros seguros e verifica sem comparação manual', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        ArgonPasswordHasher,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string): number => {
              const values: Readonly<Record<string, number>> = {
                AUTH_ARGON2_MEMORY_KIB: 19_456,
                AUTH_ARGON2_TIME_COST: 2,
                AUTH_ARGON2_PARALLELISM: 1,
              };
              return values[key] ?? 1;
            },
          },
        },
      ],
    }).compile();
    const hasher = moduleRef.get(ArgonPasswordHasher);
    const hash = await hasher.hash('uma senha longa e segura');

    expect(hash).toMatch(/^\$argon2id\$/u);
    await expect(
      hasher.verifyForLogin('uma senha longa e segura', hash),
    ).resolves.toBe(true);
    await expect(hasher.verifyForLogin('senha incorreta', hash)).resolves.toBe(
      false,
    );
    await expect(hasher.verifyForLogin('senha incorreta', null)).resolves.toBe(
      false,
    );
  });
});
