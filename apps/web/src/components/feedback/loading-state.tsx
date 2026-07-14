interface LoadingStateProps {
  label?: string;
}

export function LoadingState({
  label = 'Carregando informações',
}: LoadingStateProps) {
  return (
    <div className="status-message" role="status" aria-live="polite">
      <span className="loading-indicator" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
