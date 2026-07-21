import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Request } from 'express';

import type { Environment } from '../../../config/environment';

@Injectable()
export class SessionCookieService {
  private readonly cookieName: string;
  private readonly secure: boolean;

  public constructor(
    @Inject(ConfigService)
    configService: ConfigService<Environment, true>,
  ) {
    this.cookieName = configService.get('AUTH_COOKIE_NAME', { infer: true });
    this.secure =
      configService.get('NODE_ENV', { infer: true }) === 'production';
  }

  public read(request: Request): string | null {
    const cookies: unknown = request.cookies;
    if (typeof cookies !== 'object' || cookies === null) {
      return null;
    }
    const candidate: unknown = Reflect.get(cookies, this.cookieName);
    return typeof candidate === 'string' ? candidate : null;
  }

  public set(
    response: CookieResponse,
    rawToken: string,
    expiresAt: Date,
  ): void {
    const maxAge = Math.max(0, expiresAt.getTime() - Date.now());
    response.cookie(this.cookieName, rawToken, {
      ...this.baseOptions(),
      expires: expiresAt,
      maxAge,
    });
  }

  public clear(response: CookieResponse): void {
    response.clearCookie(this.cookieName, this.baseOptions());
  }

  public getName(): string {
    return this.cookieName;
  }

  private baseOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.secure,
      sameSite: 'lax',
      path: '/',
    };
  }
}

export interface CookieResponse {
  cookie(name: string, value: string, options: CookieOptions): unknown;
  clearCookie(name: string, options: CookieOptions): unknown;
}
