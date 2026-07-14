import { Component } from 'react';
import type { PropsWithChildren, ReactNode } from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<
  PropsWithChildren,
  ErrorBoundaryState
> {
  public override state: ErrorBoundaryState = { hasError: false };

  public static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  public override componentDidCatch(error: Error): void {
    console.error('Falha inesperada de renderização.', { name: error.name });
  }

  public override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <main className="page-shell">
          <section className="feedback-card" role="alert">
            <p className="eyebrow">Erro inesperado</p>
            <h1>Não foi possível exibir esta página.</h1>
            <p>
              Tente recarregar. Se o problema continuar, aguarde alguns minutos.
            </p>
            <button type="button" onClick={() => window.location.reload()}>
              Recarregar página
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
