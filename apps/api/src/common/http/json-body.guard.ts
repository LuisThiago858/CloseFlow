import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';

import { ApplicationError } from '../errors/application-error';

@Injectable()
export class JsonBodyGuard implements CanActivate {
  public canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (!request.is('application/json')) {
      throw new ApplicationError({
        kind: 'validation',
        code: 'VALIDATION_ERROR',
        detail: 'Envie o corpo da requisição em JSON.',
        errors: { body: ['O Content-Type deve ser application/json.'] },
      });
    }
    return true;
  }
}
