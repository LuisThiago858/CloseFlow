import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

import { ApiProblem } from '../../api/http-client';
import { FormError } from '../auth/form-error';
import { createOrganization } from './api/organizations-api';
import {
  createOrganizationFormSchema,
  type CreateOrganizationFormData,
} from './organization.contracts';
import { getOrganizationFieldErrors } from './organization-form-errors';
import { useOrganizationContext } from './use-organization-context';
import { organizationsQueryKey } from './organization-query';

export function CreateOrganizationPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { selectOrganization } = useOrganizationContext();
  const form = useForm<CreateOrganizationFormData>({
    resolver: zodResolver(createOrganizationFormSchema),
    defaultValues: { name: '', slug: '' },
  });
  const mutation = useMutation({
    mutationFn: createOrganization,
    onError: (error) => {
      if (!(error instanceof ApiProblem)) {
        return;
      }
      const fieldErrors = getOrganizationFieldErrors(error.problem, [
        'name',
        'slug',
      ]);
      fieldErrors.forEach(({ field, message }, index) => {
        form.setError(
          field,
          { type: 'server', message },
          { shouldFocus: index === 0 },
        );
      });
    },
    onSuccess: async (access) => {
      await queryClient.invalidateQueries({ queryKey: organizationsQueryKey });
      await selectOrganization(access.organization.id);
      await navigate('/app', { replace: true });
    },
  });
  const firstError = form.formState.errors.name ?? form.formState.errors.slug;
  useEffect(() => {
    if (firstError === undefined) {
      return;
    }
    if (form.formState.errors.name !== undefined) {
      form.setFocus('name');
    } else {
      form.setFocus('slug');
    }
  }, [firstError, form]);
  const fieldErrors =
    mutation.error instanceof ApiProblem
      ? getOrganizationFieldErrors(mutation.error.problem, ['name', 'slug'])
      : [];
  const error =
    mutation.isError && fieldErrors.length === 0
      ? mutation.error instanceof ApiProblem
        ? mutation.error.problem.detail
        : 'Não foi possível criar a organização.'
      : null;

  return (
    <main className="app-content">
      <section
        className="content-card"
        aria-labelledby="create-organization-title"
      >
        <h1 id="create-organization-title" className="content-title">
          Nova organização
        </h1>
        <form
          className="auth-form"
          noValidate
          onSubmit={form.handleSubmit((input) => {
            form.clearErrors();
            mutation.mutate(input);
          })}
        >
          <div className="form-field">
            <label htmlFor="organization-name">Nome</label>
            <input
              id="organization-name"
              autoComplete="organization"
              aria-invalid={form.formState.errors.name !== undefined}
              aria-describedby="organization-name-error"
              {...form.register('name')}
            />
            <p id="organization-name-error" className="field-error">
              {form.formState.errors.name?.message}
            </p>
          </div>
          <div className="form-field">
            <label htmlFor="organization-slug">Identificador</label>
            <input
              id="organization-slug"
              autoComplete="off"
              aria-invalid={form.formState.errors.slug !== undefined}
              aria-describedby="organization-slug-help organization-slug-error"
              {...form.register('slug')}
            />
            <p id="organization-slug-help" className="field-help">
              Opcional. Se ficar vazio, será gerado a partir do nome.
            </p>
            <p id="organization-slug-error" className="field-error">
              {form.formState.errors.slug?.message}
            </p>
          </div>
          <FormError message={error} />
          <button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Criando…' : 'Criar organização'}
          </button>
        </form>
      </section>
    </main>
  );
}
