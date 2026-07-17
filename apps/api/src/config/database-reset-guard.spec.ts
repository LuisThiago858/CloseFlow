import { describe, expect, it } from 'vitest';

import { assertLocalDatabaseResetAllowed } from './database-reset-guard';

describe('assertLocalDatabaseResetAllowed', () => {
  it('permite somente o banco local de desenvolvimento', () => {
    expect(() =>
      assertLocalDatabaseResetAllowed(
        'postgresql://local:local@localhost:5432/closeflow',
        'development',
      ),
    ).not.toThrow();
  });

  it.each([
    [
      'produção',
      'postgresql://local:local@localhost:5432/closeflow',
      'production',
    ],
    [
      'host remoto',
      'postgresql://local:local@db.example/closeflow',
      'development',
    ],
    [
      'banco de teste',
      'postgresql://local:local@localhost/closeflow_test',
      'development',
    ],
  ])('recusa reset em %s', (_caseName, databaseUrl, nodeEnvironment) => {
    expect(() =>
      assertLocalDatabaseResetAllowed(databaseUrl, nodeEnvironment),
    ).toThrow('Reset recusado');
  });
});
