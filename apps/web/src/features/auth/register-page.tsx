import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';

import { ApiProblem } from '../../api/http-client';
import { type RegisterFormData, registerFormSchema } from './auth.contracts';
import { authQueryKey } from './auth-query';
import { registerUser } from './api/auth-api';
import { FormError } from './form-error';

export function RegisterPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: { email: '', password: '', passwordConfirmation: '' },
  });
  const registerMutation = useMutation({ mutationFn: registerUser });

  const submit = form.handleSubmit(async (input) => {
    setServerError(null);
    try {
      const user = await registerMutation.mutateAsync(input);
      queryClient.setQueryData(authQueryKey, user);
      await navigate('/app', { replace: true });
    } catch (error: unknown) {
      if (error instanceof ApiProblem) {
        const emailErrors = error.problem.errors?.email;
        if (emailErrors?.[0] !== undefined) {
          form.setError(
            'email',
            { message: emailErrors[0] },
            { shouldFocus: true },
          );
        }
        setServerError(error.problem.detail);
      } else {
        setServerError('Não foi possível criar a conta. Tente novamente.');
      }
    }
  });

  const busy = form.formState.isSubmitting || registerMutation.isPending;

  return (
    <main className="page-shell">
      <section className="auth-card" aria-labelledby="register-title">
        <p className="eyebrow">Primeiro acesso</p>
        <h1 id="register-title" className="auth-title">
          Criar conta
        </h1>
        <p className="auth-copy">
          Cadastre somente as credenciais necessárias para acessar o CloseFlow.
        </p>

        <FormError message={serverError} />

        <form
          className="auth-form"
          onSubmit={(event) => void submit(event)}
          noValidate
        >
          <div className="form-field">
            <label htmlFor="email">E-mail</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              aria-invalid={form.formState.errors.email !== undefined}
              aria-describedby={
                form.formState.errors.email === undefined
                  ? undefined
                  : 'email-error'
              }
              {...form.register('email')}
            />
            {form.formState.errors.email === undefined ? null : (
              <p id="email-error" className="field-error">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="password">Senha</label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              aria-invalid={form.formState.errors.password !== undefined}
              aria-describedby={
                form.formState.errors.password === undefined
                  ? 'password-help'
                  : 'password-help password-error'
              }
              {...form.register('password')}
            />
            <p id="password-help" className="field-help">
              Use de 12 a 128 caracteres. Frases longas são aceitas.
            </p>
            {form.formState.errors.password === undefined ? null : (
              <p id="password-error" className="field-error">
                {form.formState.errors.password.message}
              </p>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="password-confirmation">Confirmar senha</label>
            <input
              id="password-confirmation"
              type="password"
              autoComplete="new-password"
              aria-invalid={
                form.formState.errors.passwordConfirmation !== undefined
              }
              aria-describedby={
                form.formState.errors.passwordConfirmation === undefined
                  ? undefined
                  : 'password-confirmation-error'
              }
              {...form.register('passwordConfirmation')}
            />
            {form.formState.errors.passwordConfirmation === undefined ? null : (
              <p id="password-confirmation-error" className="field-error">
                {form.formState.errors.passwordConfirmation.message}
              </p>
            )}
          </div>

          <button type="submit" disabled={busy}>
            {busy ? 'Criando conta…' : 'Criar conta'}
          </button>
        </form>

        <p className="auth-alternative">
          Já possui conta? <Link to="/login">Entrar</Link>
        </p>
      </section>
    </main>
  );
}
