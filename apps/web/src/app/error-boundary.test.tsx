import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ErrorBoundary } from './error-boundary';

function BrokenComponent(): never {
  throw new Error('falha de teste');
}

describe('ErrorBoundary', () => {
  it('exibe uma recuperação segura para falhas de renderização', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(
      <ErrorBoundary>
        <BrokenComponent />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Não foi possível exibir esta página.',
    );
    expect(
      screen.getByRole('button', { name: 'Recarregar página' }),
    ).toBeEnabled();
  });
});
