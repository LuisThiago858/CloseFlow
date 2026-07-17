const localHosts = new Set(['localhost', '127.0.0.1']);
const localDatabaseName = 'closeflow';

export function assertLocalDatabaseResetAllowed(
  databaseUrl: string | undefined,
  nodeEnvironment: string | undefined,
): URL {
  if (nodeEnvironment !== 'development') {
    throw new Error(
      'Reset recusado: NODE_ENV deve ser development para esta operação.',
    );
  }

  if (databaseUrl === undefined || databaseUrl.trim().length === 0) {
    throw new Error('Reset recusado: DATABASE_URL não está configurada.');
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(databaseUrl);
  } catch {
    throw new Error('Reset recusado: DATABASE_URL é inválida.');
  }

  if (
    !['postgres:', 'postgresql:'].includes(parsedUrl.protocol) ||
    !localHosts.has(parsedUrl.hostname) ||
    parsedUrl.pathname !== `/${localDatabaseName}`
  ) {
    throw new Error(
      'Reset recusado: somente o banco closeflow em localhost pode ser apagado.',
    );
  }

  return parsedUrl;
}
