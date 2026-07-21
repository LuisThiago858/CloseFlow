import { describe, expect, it } from 'vitest';

import { validateEnvironment } from './environment';

describe('validateEnvironment', () => {
  it('aplica defaults seguros à configuração mínima', () => {
    expect(
      validateEnvironment({ DATABASE_URL: 'postgresql://local/test' }),
    ).toMatchObject({
      NODE_ENV: 'development',
      API_PORT: 3000,
      CORS_ALLOWED_ORIGINS: ['http://localhost:5173', 'http://127.0.0.1:4173'],
      LOG_LEVEL: 'info',
      DATABASE_URL: 'postgresql://local/test',
      AUTH_COOKIE_NAME: 'closeflow_session',
      AUTH_SESSION_TTL_SECONDS: 604_800,
      AUTH_SESSION_ABSOLUTE_TTL_SECONDS: 2_592_000,
      AUTH_SESSION_RENEWAL_WINDOW_SECONDS: 86_400,
      AUTH_SESSION_ACTIVITY_INTERVAL_SECONDS: 900,
      AUTH_ARGON2_MEMORY_KIB: 19_456,
      AUTH_ARGON2_TIME_COST: 2,
      AUTH_ARGON2_PARALLELISM: 1,
      AUTH_RATE_LIMIT_MAX: 5,
      AUTH_RATE_LIMIT_WINDOW_MS: 60_000,
    });
  });

  it('falha cedo quando uma variável obrigatória está ausente', () => {
    expect(() => validateEnvironment({})).toThrow(
      'Configuração de ambiente inválida',
    );
  });

  it('rejeita uma URL de banco com protocolo inesperado', () => {
    expect(() =>
      validateEnvironment({ DATABASE_URL: 'https://localhost/database' }),
    ).toThrow('DATABASE_URL deve usar o protocolo PostgreSQL');
  });

  it('valida a URL opcional do banco de integração', () => {
    expect(() =>
      validateEnvironment({
        DATABASE_URL: 'postgresql://local/closeflow',
        DATABASE_URL_TEST: 'https://localhost/closeflow_test',
      }),
    ).toThrow('DATABASE_URL_TEST deve usar o protocolo PostgreSQL');
  });

  it('rejeita CORS curinga e origens com caminho', () => {
    expect(() =>
      validateEnvironment({
        DATABASE_URL: 'postgresql://local/closeflow',
        CORS_ALLOWED_ORIGINS: '*',
      }),
    ).toThrow('não aceita origem vazia ou curinga');
    expect(() =>
      validateEnvironment({
        DATABASE_URL: 'postgresql://local/closeflow',
        CORS_ALLOWED_ORIGINS: 'https://closeflow.example/app',
      }),
    ).toThrow('origens HTTP ou HTTPS canônicas');
  });

  it('rejeita parâmetros Argon2id abaixo do mínimo', () => {
    expect(() =>
      validateEnvironment({
        DATABASE_URL: 'postgresql://local/closeflow',
        AUTH_ARGON2_MEMORY_KIB: 8_192,
      }),
    ).toThrow('AUTH_ARGON2_MEMORY_KIB');
  });

  it('rejeita relações inválidas no ciclo da sessão', () => {
    expect(() =>
      validateEnvironment({
        DATABASE_URL: 'postgresql://local/closeflow',
        AUTH_SESSION_TTL_SECONDS: 3_600,
        AUTH_SESSION_RENEWAL_WINDOW_SECONDS: 3_600,
      }),
    ).toThrow('A janela de renovação deve ser menor');
  });
});
