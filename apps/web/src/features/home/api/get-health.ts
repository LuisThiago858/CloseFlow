export interface HealthResponse {
  status: 'ok';
  service: string;
  timestamp: string;
}

function isHealthResponse(value: unknown): value is HealthResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'status' in value &&
    value.status === 'ok' &&
    'service' in value &&
    typeof value.service === 'string' &&
    'timestamp' in value &&
    typeof value.timestamp === 'string'
  );
}

export async function getHealth(): Promise<HealthResponse> {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';
  const response = await fetch(`${apiBaseUrl}/health`, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error('A API não respondeu com sucesso.');
  }

  const payload: unknown = await response.json();

  if (!isHealthResponse(payload)) {
    throw new Error('A API retornou uma resposta inválida.');
  }

  return payload;
}
