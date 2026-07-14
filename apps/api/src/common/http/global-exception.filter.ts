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

import type { ProblemDetails } from './problem-details';

type RequestWithId = Request & { id?: string };

const statusTitles: Readonly<Record<number, string>> = {
  [HttpStatus.BAD_REQUEST]: 'Requisição inválida',
  [HttpStatus.UNAUTHORIZED]: 'Autenticação necessária',
  [HttpStatus.FORBIDDEN]: 'Acesso negado',
  [HttpStatus.NOT_FOUND]: 'Recurso não encontrado',
  [HttpStatus.CONFLICT]: 'Conflito de estado',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'Dados inválidos',
  [HttpStatus.TOO_MANY_REQUESTS]: 'Muitas requisições',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'Erro interno',
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

  return `HTTP_${status}`;
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
    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse = isHttpException
      ? exception.getResponse()
      : 'Erro interno';
    const correlationId = request.id ?? randomUUID();
    const title = statusTitles[status] ?? 'Falha na solicitação';

    if (!isHttpException) {
      this.logger.error(
        {
          err:
            exception instanceof Error
              ? exception
              : new Error('Valor desconhecido lançado como exceção.'),
          correlationId,
          method: request.method,
          path: request.originalUrl,
        },
        'Exceção não tratada',
      );
    }

    const problem: ProblemDetails = {
      type: `https://closeflow.local/problems/http-${status}`,
      title,
      status,
      code: getCode(exceptionResponse, status),
      detail: getDetail(exceptionResponse, status),
      instance: request.originalUrl,
      correlationId,
    };

    response.status(status).type('application/problem+json').send(problem);
  }
}
