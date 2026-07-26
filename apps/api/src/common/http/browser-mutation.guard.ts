import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

import type { Environment } from '../../config/environment';
import { ApplicationError } from '../errors/application-error';

@Injectable()
export class BrowserMutationGuard implements CanActivate {
  private readonly allowedOrigins: readonly string[];

  public constructor(
    @Inject(ConfigService)
    configService: ConfigService<Environment, true>,
  ) {
    this.allowedOrigins = configService.get('CORS_ALLOWED_ORIGINS', {
      infer: true,
    });
  }

  public canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const origin = request.get('origin');
    const fetchSite = request.get('sec-fetch-site');
    const crossSite = fetchSite === 'cross-site';
    const browserWithoutOrigin =
      fetchSite !== undefined && origin === undefined;
    const disallowedOrigin =
      origin !== undefined && !this.allowedOrigins.includes(origin);

    if (crossSite || browserWithoutOrigin || disallowedOrigin) {
      throw new ApplicationError({
        kind: 'forbidden',
        code: 'ORIGIN_NOT_ALLOWED',
        detail: 'A origem da requisição não é permitida.',
      });
    }
    return true;
  }
}
