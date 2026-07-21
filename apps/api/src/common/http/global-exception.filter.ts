import { randomUUID } from 'node:crypto';

import {
  Catch,
  HttpException,
  HttpStatus,
  Inject,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { PinoLogger } from 'nestjs-pino';

import {
  ApplicationError,
  type ApplicationErrorKind,
} from '../errors/application-error';
import type { ProblemDetails } from './problem-details';

type RequestWithId = Request & { id?: string };

function getAuthenticationAction(
  method: string,
  path: string,
): string | undefined {
  const routeKey = `${method.toUpperCase()} ${path}`;
  const actions: Readonly<Record<string, string>> = {
    'POST /api/v1/auth/register': 'auth.register',
    'POST /api/v1/auth/login': 'auth.login',
    'POST /api/v1/auth/logout': 'auth.logout',
    'GET /api/v1/auth/me': 'auth.session.authenticate',
    'GET /api/v1/auth/sessions': 'auth.session.list',
  };

  if (
    method.toUpperCase() === 'DELETE' &&
    /^\/api\/v1\/auth\/sessions\/[^/]+$/u.test(path)
  ) {
    return 'auth.session.revoke';
  }

  return actions[routeKey];
}

const statusTitles: Readonly<Record<number, string>> = {
  [HttpStatus.BAD_REQUEST]: 'Requisição inválida',
  [HttpStatus.UNAUTHORIZED]: 'Autenticação necessária',
  [HttpStatus.FORBIDDEN]: 'Acesso negado',
  [HttpStatus.NOT_FOUND]: 'Recurso não encontrado',
  [HttpStatus.CONFLICT]: 'Conflito de estado',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'Dados inválidos',
  [HttpStatus.TOO_MANY_REQUESTS]: 'Muitas requisições',
  [HttpStatus.SERVICE_UNAVAILABLE]: 'Serviço indisponível',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'Erro interno',
};

const applicationErrorStatuses: Readonly<
  Record<ApplicationErrorKind, HttpStatus>
> = {
  conflict: HttpStatus.CONFLICT,
  forbidden: HttpStatus.FORBIDDEN,
  not_found: HttpStatus.NOT_FOUND,
  rate_limit: HttpStatus.TOO_MANY_REQUESTS,
  unauthenticated: HttpStatus.UNAUTHORIZED,
  unavailable: HttpStatus.SERVICE_UNAVAILABLE,
  validation: HttpStatus.UNPROCESSABLE_ENTITY,
};

function readStringProperty(
  value: object,
  property: string,
): string | undefined {
  if (property in value) {
    const candidate: unknown = value[property as keyof typeof value];
    return typeof candidate === 'string' ? candidate : undefined;
  }

  return undefined;
}

function getDetail(response: string | object, status: number): string {
  if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
    return 'Ocorreu um erro inesperado ao processar a solicitação.';
  }

  if (typeof response === 'string') {
    return response;
  }

  return (
    readStringProperty(response, 'detail') ??
    readStringProperty(response, 'message') ??
    'Não foi possível processar a solicitação.'
  );
}

function getCode(response: string | object, status: number): string {
  if (typeof response === 'object') {
    const code = readStringProperty(response, 'code');
    if (code !== undefined) {
      return code;
    }
  }

  return status === HttpStatus.TOO_MANY_REQUESTS
    ? 'RATE_LIMIT_EXCEEDED'
    : `HTTP_${status}`;
}

function getErrors(
  response: string | object,
): Readonly<Record<string, readonly string[]>> | undefined {
  if (typeof response === 'string' || !('errors' in response)) {
    return undefined;
  }

  const candidate: unknown = response.errors;
  if (typeof candidate !== 'object' || candidate === null) {
    return undefined;
  }

  const sanitizedEntries = Object.entries(candidate).flatMap(
    ([field, messages]) => {
      if (!Array.isArray(messages)) {
        return [];
      }

      const safeMessages = messages.filter(
        (message): message is string => typeof message === 'string',
      );
      return safeMessages.length > 0 ? [[field, safeMessages] as const] : [];
    },
  );

  return sanitizedEntries.length > 0
    ? Object.fromEntries(sanitizedEntries)
    : undefined;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  public constructor(@Inject(PinoLogger) private readonly logger: PinoLogger) {
    this.logger.setContext(GlobalExceptionFilter.name);
  }

  public catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<RequestWithId>();
    const response = http.getResponse<Response>();
    const isApplicationError = exception instanceof ApplicationError;
    const isHttpException = exception instanceof HttpException;
    const status = isApplicationError
      ? applicationErrorStatuses[exception.kind]
      : isHttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse: string | object = isApplicationError
      ? {
          code: exception.code,
          detail: exception.detail,
          ...(exception.errors === undefined
            ? {}
            : { errors: exception.errors }),
        }
      : isHttpException
        ? exception.getResponse()
        : 'Erro interno';
    const correlationId = request.id ?? randomUUID();
    const title = statusTitles[status] ?? 'Falha na solicitação';
    const fieldErrors = getErrors(exceptionResponse);
    const code = getCode(exceptionResponse, status);

    if (!isHttpException && !isApplicationError) {
      this.logger.error(
        {
          exceptionType:
            exception instanceof Error
              ? exception.constructor.name
              : 'UnknownThrownValue',
          correlationId,
          method: request.method,
          path: request.originalUrl,
        },
        'Exceção não tratada',
      );
    }

    const authenticationAction = getAuthenticationAction(
      request.method,
      request.path,
    );
    if (authenticationAction !== undefined) {
      this.logger.warn(
        {
          action: authenticationAction,
          result: 'failure',
          code,
          status,
          correlationId,
        },
        'Operação de autenticação recusada.',
      );
    }

    const problem: ProblemDetails = {
      type: `https://closeflow.local/problems/http-${status}`,
      title,
      status,
      code,
      detail: getDetail(exceptionResponse, status),
      instance: request.originalUrl,
      correlationId,
      ...(fieldErrors === undefined ? {} : { errors: fieldErrors }),
    };

    response.status(status).type('application/problem+json').send(problem);
  }
}
