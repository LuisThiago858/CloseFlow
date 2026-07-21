import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';

import type { Environment } from '../../../config/environment';
import type { PasswordHasher } from '../application/ports/password-hasher';

const dummyPassword = 'closeflow-dummy-login-password';

@Injectable()
export class ArgonPasswordHasher implements PasswordHasher {
  private readonly memoryCost: number;
  private readonly timeCost: number;
  private readonly parallelism: number;
  private readonly dummyHash: Promise<string>;

  public constructor(
    @Inject(ConfigService)
    configService: ConfigService<Environment, true>,
  ) {
    this.memoryCost = configService.get('AUTH_ARGON2_MEMORY_KIB', {
      infer: true,
    });
    this.timeCost = configService.get('AUTH_ARGON2_TIME_COST', { infer: true });
    this.parallelism = configService.get('AUTH_ARGON2_PARALLELISM', {
      infer: true,
    });
    this.dummyHash = this.hash(dummyPassword);
  }

  public async hash(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: this.memoryCost,
      timeCost: this.timeCost,
      parallelism: this.parallelism,
      hashLength: 32,
    });
  }

  public async verifyForLogin(
    password: string,
    passwordHash: string | null,
  ): Promise<boolean> {
    const hash = passwordHash ?? (await this.dummyHash);
    try {
      return await argon2.verify(hash, password);
    } catch {
      return false;
    }
  }
}
