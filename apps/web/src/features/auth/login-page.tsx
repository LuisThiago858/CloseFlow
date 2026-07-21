import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';

import { ApiProblem } from '../../api/http-client';
import { type LoginFormData, loginFormSchema } from './auth.contracts';
import { authQueryKey } from './auth-query';
import { loginUser } from './api/auth-api';
import { FormError } from './form-error';

export function LoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: '', password: '' },
  });
  const loginMutation = useMutation({ mutationFn: loginUser });

  const submit = form.handleSubmit(async (input) => {
    setServerError(null);
    try {
      const user = await loginMutation.mutateAsync(input);
      queryClient.setQueryData(authQueryKey, user);
      await navigate('/app', { replace: true });
    } catch (error: unknown) {
      const message =
        error instanceof ApiProblem
          ? error.problem.detail
          : 'Não foi possível entrar. Tente novamente.';
      setServerError(message);
    }
  });

  const busy = form.formState.isSubmitting || loginMutation.isPending;

  return (
    <main className="page-shell">
      <section className="auth-card" aria-labelledby="login-title">
        <p className="eyebrow">Acesso seguro</p>
        <h1 id="login-title" className="auth-title">
          Entrar no CloseFlow
        </h1>
        <p className="auth-copy">
          Use seu e-mail e sua senha. A sessão será mantida por um cookie
          seguro.
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
              autoComplete="current-password"
              aria-invalid={form.formState.errors.password !== undefined}
              aria-describedby={
                form.formState.errors.password === undefined
                  ? undefined
                  : 'password-error'
              }
              {...form.register('password')}
            />
            {form.formState.errors.password === undefined ? null : (
              <p id="password-error" className="field-error">
                {form.formState.errors.password.message}
              </p>
            )}
          </div>

          <button type="submit" disabled={busy}>
            {busy ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <p className="auth-alternative">
          Ainda não possui conta? <Link to="/register">Criar conta</Link>
        </p>
      </section>
    </main>
  );
}
