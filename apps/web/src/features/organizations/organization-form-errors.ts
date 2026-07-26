import type { ProblemDetails } from '../../api/http-client';

export type OrganizationFormField = 'name' | 'slug';

export interface OrganizationFieldError {
  field: OrganizationFormField;
  message: string;
}

export function getOrganizationFieldErrors(
  problem: ProblemDetails,
  recognizedFields: readonly OrganizationFormField[],
): OrganizationFieldError[] {
  return recognizedFields.flatMap((field) => {
    const message = problem.errors?.[field]?.[0];
    return message === undefined ? [] : [{ field, message }];
  });
}
