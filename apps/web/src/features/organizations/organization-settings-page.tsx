import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

import { ApiProblem } from '../../api/http-client';
import { ErrorState } from '../../components/feedback/error-state';
import { LoadingState } from '../../components/feedback/loading-state';
import { FormError } from '../auth/form-error';
import { updateOrganization } from './api/organizations-api';
import {
  type OrganizationAccess,
  type UpdateOrganizationFormData,
  updateOrganizationFormSchema,
} from './organization.contracts';
import { getOrganizationFieldErrors } from './organization-form-errors';
import {
  organizationQueryKey,
  organizationsQueryKey,
} from './organization-query';
import { useSelectedOrganization } from './use-selected-organization';

export function OrganizationSettingsPage() {
  const queryClient = useQueryClient();
  const organization = useSelectedOrganization();
  const form = useForm<UpdateOrganizationFormData>({
    resolver: zodResolver(updateOrganizationFormSchema),
    defaultValues: { name: '' },
  });
  useEffect(() => {
    if (organization.data !== undefined) {
      form.reset({ name: organization.data.organization.name });
    }
  }, [form, organization.data]);
  const mutation = useMutation({
    mutationFn: ({
      organizationId,
      input,
    }: {
      organizationId: string;
      access: OrganizationAccess;
      input: UpdateOrganizationFormData;
    }) => updateOrganization(organizationId, input),
    onSuccess: async (updated, source) => {
      queryClient.setQueryData(organizationQueryKey(source.organizationId), {
        ...source.access,
        organization: updated,
      });
      await queryClient.invalidateQueries({ queryKey: organizationsQueryKey });
    },
  });
  const mutationBelongsToActiveOrganization =
    mutation.variables?.organizationId === organization.data?.organization.id;
  const fieldErrors =
    mutationBelongsToActiveOrganization && mutation.error instanceof ApiProblem
      ? getOrganizationFieldErrors(mutation.error.problem, ['name'])
      : [];
  const fieldErrorMessage = fieldErrors[0]?.message;
  useEffect(() => {
    if (fieldErrorMessage !== undefined) {
      form.setError(
        'name',
        { type: 'server', message: fieldErrorMessage },
        { shouldFocus: true },
      );
    }
  }, [fieldErrorMessage, form]);

  if (organization.isPending || organization.lostAccess) {
    return (
      <main className="app-content">
        <LoadingState label="Carregando configurações" />
      </main>
    );
  }
  if (organization.isError) {
    return (
      <main className="app-content">
        <ErrorState
          message="Não foi possível carregar as configurações."
          onRetry={() => void organization.refetch()}
        />
      </main>
    );
  }
  const isOwner = organization.data.membership.role === 'OWNER';
  const error =
    mutationBelongsToActiveOrganization &&
    mutation.isError &&
    fieldErrors.length === 0
      ? mutation.error instanceof ApiProblem
        ? mutation.error.problem.detail
        : 'Não foi possível atualizar a organização.'
      : null;
  return (
    <main className="app-content">
      <section
        className="content-card"
        aria-labelledby="organization-settings-title"
      >
        <h1 id="organization-settings-title" className="content-title">
          Configurações da organização
        </h1>
        <form
          className="auth-form"
          noValidate
          onSubmit={form.handleSubmit((input) => {
            form.clearErrors();
            mutation.mutate({
              organizationId: organization.data.organization.id,
              access: organization.data,
              input,
            });
          })}
        >
          <div className="form-field">
            <label htmlFor="settings-organization-name">Nome</label>
            <input
              id="settings-organization-name"
              readOnly={!isOwner}
              aria-readonly={!isOwner}
              aria-invalid={form.formState.errors.name !== undefined}
              aria-describedby="settings-organization-name-error"
              {...form.register('name')}
            />
            <p id="settings-organization-name-error" className="field-error">
              {form.formState.errors.name?.message}
            </p>
          </div>
          <div className="form-field">
            <label htmlFor="settings-organization-slug">Identificador</label>
            <input
              id="settings-organization-slug"
              readOnly
              value={organization.data.organization.slug}
            />
          </div>
          {!isOwner ? <p>Somente owners podem alterar o nome.</p> : null}
          <FormError message={error} />
          {isOwner ? (
            <button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Salvando…' : 'Salvar nome'}
            </button>
          ) : null}
        </form>
      </section>
    </main>
  );
}
