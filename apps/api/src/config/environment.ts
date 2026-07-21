import { z } from 'zod';

const postgresqlUrl = (variableName: string) =>
  z
    .url(`${variableName} deve ser uma URL válida.`)
    .refine(
      (value) => ['postgres:', 'postgresql:'].includes(new URL(value).protocol),
      `${variableName} deve usar o protocolo PostgreSQL.`,
    );

function parseAllowedOrigins(value: string): string[] {
  return value.split(',').map((origin) => origin.trim());
}

const allowedOrigins = z
  .string()
  .min(1, 'CORS_ALLOWED_ORIGINS deve conter ao menos uma origem.')
  .transform(parseAllowedOrigins)
  .superRefine((origins, context) => {
    if (origins.some((origin) => origin.length === 0 || origin === '*')) {
      context.addIssue({
        code: 'custom',
        message: 'CORS_ALLOWED_ORIGINS não aceita origem vazia ou curinga.',
      });
      return;
    }

    for (const origin of origins) {
      try {
        const parsed = new URL(origin);
        const hasUnsupportedParts =
          !['http:', 'https:'].includes(parsed.protocol) ||
          parsed.username.length > 0 ||
          parsed.password.length > 0 ||
          parsed.pathname !== '/' ||
          parsed.search.length > 0 ||
          parsed.hash.length > 0 ||
          parsed.origin !== origin;

        if (hasUnsupportedParts) {
          throw new Error('Origem não canônica.');
        }
      } catch {
        context.addIssue({
          code: 'custom',
          message:
            'CORS_ALLOWED_ORIGINS deve conter somente origens HTTP ou HTTPS canônicas.',
        });
      }
    }

    if (new Set(origins).size !== origins.length) {
      context.addIssue({
        code: 'custom',
        message: 'CORS_ALLOWED_ORIGINS não deve conter valores duplicados.',
      });
    }
  });

const environmentSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    API_PORT: z.coerce.number().int().positive().max(65_535).default(3000),
    CORS_ALLOWED_ORIGINS: allowedOrigins.default([
      'http://localhost:5173',
      'http://127.0.0.1:4173',
    ]),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    DATABASE_URL: postgresqlUrl('DATABASE_URL'),
    DATABASE_URL_TEST: postgresqlUrl('DATABASE_URL_TEST').optional(),
    AUTH_COOKIE_NAME: z
      .string()
      .regex(/^[A-Za-z0-9_-]+$/, 'AUTH_COOKIE_NAME possui formato inválido.')
      .default('closeflow_session'),
    AUTH_SESSION_TTL_SECONDS: z.coerce
      .number()
      .int()
      .min(3_600)
      .default(604_800),
    AUTH_SESSION_ABSOLUTE_TTL_SECONDS: z.coerce
      .number()
      .int()
      .min(3_600)
      .default(2_592_000),
    AUTH_SESSION_RENEWAL_WINDOW_SECONDS: z.coerce
      .number()
      .int()
      .min(60)
      .default(86_400),
    AUTH_SESSION_ACTIVITY_INTERVAL_SECONDS: z.coerce
      .number()
      .int()
      .min(60)
      .default(900),
    AUTH_ARGON2_MEMORY_KIB: z.coerce
      .number()
      .int()
      .min(19_456)
      .max(262_144)
      .default(19_456),
    AUTH_ARGON2_TIME_COST: z.coerce.number().int().min(2).max(10).default(2),
    AUTH_ARGON2_PARALLELISM: z.coerce.number().int().min(1).max(4).default(1),
    AUTH_RATE_LIMIT_MAX: z.coerce.number().int().min(1).max(1_000).default(5),
    AUTH_RATE_LIMIT_WINDOW_MS: z.coerce
      .number()
      .int()
      .min(1_000)
      .max(3_600_000)
      .default(60_000),
  })
  .superRefine((environment, context) => {
    if (
      environment.AUTH_SESSION_RENEWAL_WINDOW_SECONDS >=
      environment.AUTH_SESSION_TTL_SECONDS
    ) {
      context.addIssue({
        code: 'custom',
        path: ['AUTH_SESSION_RENEWAL_WINDOW_SECONDS'],
        message:
          'A janela de renovação deve ser menor que a duração da sessão.',
      });
    }

    if (
      environment.AUTH_SESSION_TTL_SECONDS >
      environment.AUTH_SESSION_ABSOLUTE_TTL_SECONDS
    ) {
      context.addIssue({
        code: 'custom',
        path: ['AUTH_SESSION_ABSOLUTE_TTL_SECONDS'],
        message:
          'O limite absoluto deve ser maior ou igual à duração da sessão.',
      });
    }

    if (
      environment.AUTH_SESSION_ACTIVITY_INTERVAL_SECONDS >
      environment.AUTH_SESSION_RENEWAL_WINDOW_SECONDS
    ) {
      context.addIssue({
        code: 'custom',
        path: ['AUTH_SESSION_ACTIVITY_INTERVAL_SECONDS'],
        message:
          'O intervalo de atividade deve ser menor ou igual à janela de renovação.',
      });
    }
  });

export type Environment = z.infer<typeof environmentSchema>;

export function validateEnvironment(
  values: Record<string, unknown>,
): Environment {
  const result = environmentSchema.safeParse(values);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');

    throw new Error(`Configuração de ambiente inválida: ${issues}`);
  }

  return result.data;
}
