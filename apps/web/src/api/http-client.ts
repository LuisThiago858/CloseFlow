import { z } from 'zod';

const problemDetailsSchema = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number().int(),
  code: z.string(),
  detail: z.string(),
  instance: z.string(),
  correlationId: z.string(),
  errors: z.record(z.string(), z.array(z.string())).optional(),
});

export type ProblemDetails = z.infer<typeof problemDetailsSchema>;

export class ApiProblem extends Error {
  public readonly problem: ProblemDetails;

  public constructor(problem: ProblemDetails) {
    super(problem.detail);
    this.name = 'ApiProblem';
    this.problem = problem;
  }
}

function getApiBaseUrl(): string {
  return import.meta.env.VITE_API_BASE_URL ?? '/api/v1';
}

async function parseProblem(response: Response): Promise<ApiProblem> {
  try {
    const payload: unknown = await response.json();
    const parsed = problemDetailsSchema.safeParse(payload);
    if (parsed.success) {
      return new ApiProblem(parsed.data);
    }
  } catch {
    // A resposta será normalizada abaixo sem expor o payload inválido.
  }

  return new ApiProblem({
    type: 'about:blank',
    title: 'Falha na solicitação',
    status: response.status,
    code: `HTTP_${response.status}`,
    detail: 'Não foi possível concluir a solicitação.',
    instance: '',
    correlationId: '',
  });
}

export async function apiRequest<T>(
  path: string,
  schema: z.ZodType<T>,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(init?.body === undefined
        ? {}
        : { 'Content-Type': 'application/json' }),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    throw await parseProblem(response);
  }

  const payload: unknown = await response.json();
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw new Error('A API retornou uma resposta incompatível com o contrato.');
  }
  return parsed.data;
}

export async function apiRequestWithoutResponse(
  path: string,
  init: RequestInit,
): Promise<void> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...init.headers,
    },
  });
  if (!response.ok) {
    throw await parseProblem(response);
  }
}
