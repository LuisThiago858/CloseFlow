# CloseFlow

CloseFlow é uma plataforma SaaS B2B de controle operacional e governança do fechamento financeiro mensal. O produto ajuda organizações a planejar, executar, revisar e comprovar fechamentos.

## Estado do projeto

O repositório contém a fundação técnica, persistência e autenticação local da Fase 3, ainda sem funcionalidades financeiras:

- monorepo com pnpm workspaces;
- frontend React/Vite com Router, TanStack Query, Tailwind e testes;
- API NestJS com liveness/readiness, ambiente validado, logs estruturados, Problem Details e OpenAPI;
- Prisma 7 com adapter PostgreSQL, módulo central de banco e migrations de `users`/`sessions`;
- cadastro, login, logout, `/auth/me`, listagem/revogação de sessões, Argon2id e cookies seguros;
- frontend mínimo de cadastro/login e rota protegida, sem armazenar tokens no JavaScript;
- PostgreSQL persistente para desenvolvimento e instância efêmera isolada para integração;
- lint, formatação, typecheck, testes unitários/integração/E2E, build e CI com PostgreSQL real e Chromium.

Organizações, memberships, papéis, recuperação de senha, MFA, models financeiros, Redis, filas, uploads e integrações ainda não foram implementados.

## Requisitos locais

- Node.js 24 ou superior;
- pnpm 11 ou superior;
- Docker Desktop com Docker Compose v2;
- Git.
- Chromium do Playwright para executar o gate E2E.

Confirme o ambiente:

```bash
node --version
pnpm --version
docker --version
docker compose version
```

## Preparação inicial

1. Crie o arquivo local de ambiente sem versioná-lo.

   PowerShell:

   ```powershell
   Copy-Item .env.example .env
   ```

   Bash:

   ```bash
   cp .env.example .env
   ```

2. Revise os valores exclusivamente locais em `.env`. O exemplo não contém credenciais reais.

3. Instale as dependências pelo lockfile:

   ```bash
   pnpm install --frozen-lockfile
   pnpm test:e2e:install
   ```

4. Inicie o PostgreSQL:

   ```bash
   docker compose up -d postgres
   docker compose ps
   ```

   Aguarde o serviço aparecer como `healthy`.

5. Gere o Prisma Client e aplique as migrations locais:

   ```bash
   pnpm prisma:generate
   pnpm db:migrate:deploy
   pnpm db:migrate:status
   ```

   A baseline permanece vazia; a migration seguinte cria somente `users`, `sessions`, índices e constraints da autenticação.

## Executar as aplicações

Para iniciar frontend e backend juntos:

```bash
pnpm dev
```

Ou use terminais separados:

```bash
pnpm dev:api
pnpm dev:web
```

Endereços locais:

- Frontend: [http://localhost:5173](http://localhost:5173)
- Health da API: [http://localhost:3000/api/v1/health](http://localhost:3000/api/v1/health)
- Liveness da API: [http://localhost:3000/api/v1/health/live](http://localhost:3000/api/v1/health/live)
- Readiness da API: [http://localhost:3000/api/v1/health/ready](http://localhost:3000/api/v1/health/ready)
- Swagger UI: [http://localhost:3000/api/docs](http://localhost:3000/api/docs)
- OpenAPI JSON: [http://localhost:3000/api/docs/openapi.json](http://localhost:3000/api/docs/openapi.json)
- Cadastro: [http://localhost:5173/register](http://localhost:5173/register)
- Login: [http://localhost:5173/login](http://localhost:5173/login)
- Rota protegida temporária: [http://localhost:5173/app](http://localhost:5173/app)

O frontend usa o proxy do Vite para acessar `/api` com cookies. Em desenvolvimento o cookie não usa `Secure`; em produção esse atributo é obrigatório. `/health/live` verifica somente o processo; `/health` e `/health/ready` consultam o PostgreSQL e retornam `503` seguro quando ele estiver indisponível.

## Comandos do monorepo

| Comando                      | Finalidade                                                    |
| ---------------------------- | ------------------------------------------------------------- |
| `pnpm dev`                   | Executa API e web em paralelo                                 |
| `pnpm lint`                  | Executa ESLint em todos os workspaces                         |
| `pnpm format:check`          | Confere formatação sem alterar arquivos                       |
| `pnpm typecheck`             | Verifica TypeScript estrito                                   |
| `pnpm test`                  | Executa testes unitários                                      |
| `pnpm test:integration`      | Executa integração da API contra `DATABASE_URL_TEST`          |
| `pnpm test:e2e`              | Executa os fluxos web reais com API, preview e Chromium       |
| `pnpm test:e2e:install`      | Instala o Chromium gerenciado pelo Playwright                 |
| `pnpm build`                 | Gera builds de API e web                                      |
| `pnpm prisma:generate`       | Gera o client tipado não versionado                           |
| `pnpm prisma:validate`       | Valida configuração e schema Prisma                           |
| `pnpm db:migrate:dev --name` | Cria/aplica migration somente no desenvolvimento local        |
| `pnpm db:migrate:deploy`     | Aplica migrations versionadas sem fluxo interativo            |
| `pnpm db:migrate:status`     | Compara migrations locais e aplicadas                         |
| `pnpm db:migrate:test`       | Aplica migrations em `DATABASE_URL_TEST`                      |
| `pnpm db:seed`               | Executa seed; atualmente não cria dados                       |
| `pnpm db:studio`             | Abre Prisma Studio no banco de desenvolvimento                |
| `pnpm check`                 | Executa todos os gates; exige PostgreSQL de testes e Chromium |

## Comandos do frontend

```bash
pnpm --filter @closeflow/web dev
pnpm --filter @closeflow/web lint
pnpm --filter @closeflow/web typecheck
pnpm --filter @closeflow/web test
pnpm --filter @closeflow/web test:watch
pnpm --filter @closeflow/web build
pnpm --filter @closeflow/web preview
```

O build é gerado em `apps/web/dist`.

## Comandos do backend

```bash
pnpm --filter @closeflow/api dev
pnpm --filter @closeflow/api start
pnpm --filter @closeflow/api lint
pnpm --filter @closeflow/api typecheck
pnpm --filter @closeflow/api test
pnpm --filter @closeflow/api test:watch
pnpm --filter @closeflow/api test:integration
pnpm --filter @closeflow/api prisma:generate
pnpm --filter @closeflow/api prisma:validate
pnpm --filter @closeflow/api build
pnpm --filter @closeflow/api start:prod
```

O build é gerado em `apps/api/dist`. Execute `build` antes de `start:prod`.

## Comandos do Docker

```bash
# Iniciar o banco
docker compose up -d postgres

# Consultar saúde e portas
docker compose ps

# Acompanhar logs
docker compose logs -f postgres

# Iniciar o banco efêmero de testes
pnpm db:test:up

# Aplicar migrations e executar integração
pnpm db:migrate:test
pnpm test:integration

# Remover somente o container/banco de testes
pnpm db:test:down

# Parar os serviços preservando dados
docker compose stop

# Remover containers e rede preservando o volume
docker compose down

# Remover também os dados locais (ação destrutiva)
docker compose down --volumes
```

O volume persistente chama-se `closeflow_postgres_data`.
O serviço `postgres-test` usa `tmpfs`, porta padrão `5433` e desaparece com `pnpm db:test:down`. Ele não compartilha dados nem volume com desenvolvimento.

`pnpm db:reset:local:dangerous` apaga e recria somente o banco `closeflow` em `localhost` quando `NODE_ENV=development`. O guard recusa hosts remotos, outros ambientes e o banco de testes.

## Variáveis de ambiente

| Variável                 | Uso                                                    |
| ------------------------ | ------------------------------------------------------ |
| `NODE_ENV`               | Ambiente da API: `development`, `test` ou `production` |
| `API_PORT`               | Porta HTTP da API                                      |
| `CORS_ALLOWED_ORIGINS`   | Lista exata de origens CORS separadas por vírgula      |
| `VITE_API_BASE_URL`      | Prefixo usado pelo frontend para acessar a API         |
| `LOG_LEVEL`              | Nível dos logs JSON do Pino                            |
| `POSTGRES_DB`            | Banco local criado pelo container                      |
| `POSTGRES_USER`          | Usuário local do PostgreSQL                            |
| `POSTGRES_PASSWORD`      | Senha exclusivamente local                             |
| `POSTGRES_PORT`          | Porta exposta somente em loopback                      |
| `DATABASE_URL`           | URL usada pela aplicação para acessar o PostgreSQL     |
| `POSTGRES_TEST_DB`       | Nome do banco descartável de integração                |
| `POSTGRES_TEST_USER`     | Usuário exclusivamente local de integração             |
| `POSTGRES_TEST_PASSWORD` | Senha exclusivamente local de integração               |
| `POSTGRES_TEST_PORT`     | Porta isolada do PostgreSQL de integração              |
| `DATABASE_URL_TEST`      | URL obrigatória para migrations/testes de integração   |

Variáveis de autenticação:

| Variável                                 | Uso                                            |
| ---------------------------------------- | ---------------------------------------------- |
| `AUTH_COOKIE_NAME`                       | Nome do cookie opaco                           |
| `AUTH_SESSION_TTL_SECONDS`               | Validade deslizante da sessão                  |
| `AUTH_SESSION_ABSOLUTE_TTL_SECONDS`      | Limite absoluto desde a criação                |
| `AUTH_SESSION_RENEWAL_WINDOW_SECONDS`    | Janela em que a expiração pode ser renovada    |
| `AUTH_SESSION_ACTIVITY_INTERVAL_SECONDS` | Intervalo mínimo entre escritas de atividade   |
| `AUTH_ARGON2_MEMORY_KIB`                 | Memória do Argon2id, nunca abaixo de 19456 KiB |
| `AUTH_ARGON2_TIME_COST`                  | Iterações Argon2id, nunca abaixo de 2          |
| `AUTH_ARGON2_PARALLELISM`                | Paralelismo Argon2id                           |
| `AUTH_RATE_LIMIT_MAX`                    | Tentativas por endpoint e janela               |
| `AUTH_RATE_LIMIT_WINDOW_MS`              | Janela do rate limit em memória                |

A API falha no startup se `DATABASE_URL` estiver ausente ou não usar PostgreSQL. `DATABASE_URL_TEST` é exigida apenas nos fluxos de integração. URLs e credenciais nunca são retornadas pelo health nem registradas em erros de conexão.

## Estrutura

```text
apps/
  api/                  # API NestJS e módulos técnicos
    src/common/http/    # Problem Details e filtro global
    src/config/         # validação central do ambiente
    src/modules/health/ # liveness e readiness da API
    src/modules/identity/ # domínio, casos de uso, Prisma e HTTP de autenticação
    src/shared/database/ # PrismaService central e lifecycle
    prisma/             # schema, migrations de identidade e seed vazio
  web/                  # aplicação React/Vite
    src/app/            # providers, Router e Error Boundary
    src/components/     # feedback visual reutilizado
    src/features/       # páginas e comportamento por feature
    src/styles/         # estilos globais e Tailwind
docs/                   # produto, arquitetura, segurança e qualidade
```

Não existe pacote compartilhado nesta fase. Um pacote só será criado após reuso concreto e fronteira estável.

## Integração contínua

O workflow `.github/workflows/ci.yml` provisiona PostgreSQL 17 exclusivo do job, instala exatamente o lockfile com cache do pnpm e executa:

1. geração e validação do Prisma Client/schema;
2. `migrate deploy` e `migrate status`;
3. formatação, lint e typecheck;
4. testes unitários e de integração;
5. build;
6. Playwright/Chromium com os fluxos essenciais de autenticação.

Não há etapa de deploy.

## Solução de problemas

### `node` ou `pnpm` não é reconhecido

Instale Node 24 e habilite o pnpm com Corepack, ou instale pnpm 11 conforme a documentação oficial. Feche e reabra o terminal após alterar o `PATH`.

### Porta 3000, 5173, 5432 ou 5433 já está em uso

Altere `API_PORT`, `POSTGRES_PORT` ou `POSTGRES_TEST_PORT` no `.env`. Para a porta do frontend, ajuste `apps/web/vite.config.ts`. Confirme processos e containers existentes antes de encerrá-los.

### PostgreSQL não fica `healthy`

```bash
docker compose ps
docker compose logs postgres
```

Confirme se a porta está livre e se as variáveis do `.env` são consistentes. Se credenciais foram alteradas após a criação do volume, recrie o banco local somente se puder perder os dados:

```bash
docker compose down --volumes
docker compose up -d postgres
```

Para o banco de testes, use `docker compose --profile test ps` e `docker compose --profile test logs postgres-test`. Remova e recrie somente esse container com `pnpm db:test:down` e `pnpm db:test:up`.

### Prisma Client ausente ou desatualizado

```bash
pnpm prisma:generate
pnpm prisma:validate
```

O diretório gerado é ignorado pelo Git. Não edite os arquivos gerados manualmente.

### Migration pendente ou divergente

```bash
pnpm db:migrate:status
pnpm db:migrate:deploy
```

Use `db:migrate:dev` somente para criar migrations no banco local. CI, testes compartilhados e produção usam `migrate deploy`. Nunca altere migration já aplicada.

### Testes de integração não iniciam

Confirme que `.env` contém `DATABASE_URL_TEST`, que ela aponta para o banco isolado e que o serviço está saudável:

```bash
pnpm db:test:up
docker compose --profile test ps
pnpm db:migrate:test
pnpm test:integration
```

### Testes E2E não iniciam

Instale o navegador e confirme que as portas 3100 e 4173 estão livres:

```bash
pnpm test:e2e:install
pnpm build
pnpm db:migrate:test
pnpm test:e2e
```

O Playwright usa a API na porta 3100 para não conflitar com o desenvolvimento em 3000. Se uma execução for interrompida, confirme e encerre somente os processos temporários `node dist/main.js` ou `vite preview` antes de repetir.

### Cookie não é enviado ou a origem é recusada

Use o frontend pelo endereço listado em `CORS_ALLOWED_ORIGINS` e mantenha `credentials: include`. Não use `*` com cookies. Após alterar origem ou `API_PORT`, reinicie API e Vite. Em produção, HTTPS é obrigatório porque o cookie sempre usa `Secure`.

### Login retorna `429`

O limite padrão é cinco tentativas por endpoint em 60 segundos e reside na memória do processo. Aguarde a janela ou ajuste somente o ambiente local. Múltiplas instâncias exigirão rate limit distribuído antes do deploy.

### API encerra com “Configuração de ambiente inválida”

Confirme que `.env` existe na raiz e contém todas as variáveis de `.env.example`. A API valida configuração antes de abrir a porta.

### Frontend informa que a API está indisponível

Confirme `pnpm dev:api` e acesse diretamente `/api/v1/health`. Se `API_PORT` mudou, reinicie o Vite para que o proxy releia o `.env`.

### Instalação ou build parece usar estado antigo

Não apague o lockfile. Execute novamente `pnpm install --frozen-lockfile`; se necessário, remova somente `node_modules` e reinstale. Não use atualização ampla de dependências como correção de cache.

### Docker exibe aviso de acesso ao `config.json`

Verifique as permissões de `%USERPROFILE%\.docker\config.json` e se o Docker Desktop está usando o mesmo usuário do terminal. O aviso pode impedir acesso ao daemon ou a registries.

## Mapa da documentação

- [Visão do produto](docs/product/vision.md)
- [Personas](docs/product/personas.md)
- [Escopo do MVP](docs/product/mvp-scope.md)
- [Jornadas](docs/product/user-journeys.md)
- [Regras de negócio](docs/product/business-rules.md)
- [Visão de arquitetura](docs/architecture/overview.md)
- [Backend](docs/architecture/backend.md)
- [Frontend](docs/architecture/frontend.md)
- [Multitenancy](docs/architecture/multitenancy.md)
- [Modelo de dados](docs/architecture/data-model.md)
- [Baseline de segurança](docs/security/security-baseline.md)
- [Modelo de ameaças](docs/security/threat-model.md)
- [Estratégia de testes](docs/quality/testing-strategy.md)
- [Definition of Done](docs/quality/definition-of-done.md)
- [Roadmap](docs/roadmap/implementation-roadmap.md)
- [Decisões arquiteturais](docs/decisions/ADR-001-modular-monolith.md)
- [Convenções de persistência](docs/decisions/ADR-005-persistence-conventions.md)
- [Sessões opacas no PostgreSQL](docs/decisions/ADR-006-opaque-database-sessions.md)

Toda evolução deve seguir o [AGENTS.md](AGENTS.md), os ADRs aceitos, o roadmap e a Definition of Done.
