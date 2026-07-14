import { describe, expect, it } from 'vitest';

import { validateEnvironment } from './environment';

describe('validateEnvironment', () => {
  it('aplica defaults seguros à configuração mínima', () => {
    expect(
      validateEnvironment({ DATABASE_URL: 'postgresql://local/test' }),
    ).toEqual({
      NODE_ENV: 'development',
      API_PORT: 3000,
      WEB_ORIGIN: 'http://localhost:5173',
      LOG_LEVEL: 'info',
      DATABASE_URL: 'postgresql://local/test',
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
});
