import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';

import { ApplicationError } from '../../../common/errors/application-error';

@Injectable()
export class JsonBodyGuard implements CanActivate {
  public canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (request.is('application/json') !== 'application/json') {
      throw new ApplicationError({
        kind: 'validation',
        code: 'VALIDATION_ERROR',
        detail: 'O corpo da requisição deve usar application/json.',
      });
    }
    return true;
  }
}
