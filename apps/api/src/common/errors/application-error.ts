export type ApplicationErrorKind =
  | 'bad_request'
  | 'conflict'
  | 'forbidden'
  | 'not_found'
  | 'rate_limit'
  | 'unauthenticated'
  | 'unavailable'
  | 'validation';

export interface ApplicationErrorOptions {
  kind: ApplicationErrorKind;
  code: string;
  detail: string;
  errors?: Readonly<Record<string, readonly string[]>>;
}

export class ApplicationError extends Error {
  public readonly kind: ApplicationErrorKind;
  public readonly code: string;
  public readonly detail: string;
  public readonly errors:
    Readonly<Record<string, readonly string[]>> | undefined;

  public constructor(options: ApplicationErrorOptions) {
    super(options.detail);
    this.name = 'ApplicationError';
    this.kind = options.kind;
    this.code = options.code;
    this.detail = options.detail;
    this.errors = options.errors;
  }
}
