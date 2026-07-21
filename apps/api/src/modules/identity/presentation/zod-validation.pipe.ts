import type { PipeTransform } from '@nestjs/common';
import type { ZodType } from 'zod';

import { ApplicationError } from '../../../common/errors/application-error';

export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  public constructor(
    private readonly schema: ZodType<T>,
    private readonly fallbackField = 'body',
  ) {}

  public transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (result.success) {
      return result.data;
    }

    const errors: Record<string, string[]> = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0]?.toString() ?? this.fallbackField;
      errors[field] = [...(errors[field] ?? []), issue.message];
    }
    throw new ApplicationError({
      kind: 'validation',
      code: 'VALIDATION_ERROR',
      detail: 'Revise os dados informados.',
      errors,
    });
  }
}
