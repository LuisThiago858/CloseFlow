# CloseFlow

CloseFlow é uma plataforma SaaS B2B de controle operacional e governança do fechamento financeiro mensal. O produto ajuda organizações a planejar, executar, revisar e comprovar fechamentos.

## Estado do projeto

O repositório contém somente a fundação técnica inicial:

- monorepo com pnpm workspaces;
- frontend React/Vite com Router, TanStack Query, Tailwind e testes;
- API NestJS com health check, ambiente validado, logs estruturados, Problem Details e OpenAPI;
- PostgreSQL local por Docker Compose;
- lint, formatação, typecheck, testes, build e CI.

Autenticação, organizações, modelos de negócio, Prisma, Redis, filas, uploads e integrações ainda não foram implementados.

## Requisitos locais

- Node.js 24 ou superior;
- pnpm 11 ou superior;
- Docker Desktop com Docker Compose v2;
- Git.

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
   ```

4. Inicie o PostgreSQL:

   ```bash
   docker compose up -d postgres
   docker compose ps
   ```

   Aguarde o serviço aparecer como `healthy`.

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
- Swagger UI: [http://localhost:3000/api/docs](http://localhost:3000/api/docs)
- OpenAPI JSON: [http://localhost:3000/api/docs/openapi.json](http://localhost:3000/api/docs/openapi.json)

O frontend usa o proxy do Vite para acessar `/api`. O endpoint `/health` é um liveness check do processo da API; a saúde do PostgreSQL é verificada separadamente pelo Compose.

## Comandos do monorepo

| Comando             | Finalidade                                   |
| ------------------- | -------------------------------------------- |
| `pnpm dev`          | Executa API e web em paralelo                |
| `pnpm lint`         | Executa ESLint em todos os workspaces        |
| `pnpm lint:fix`     | Aplica correções seguras do ESLint           |
| `pnpm format`       | Formata arquivos com Prettier                |
| `pnpm format:check` | Confere formatação sem alterar arquivos      |
| `pnpm typecheck`    | Verifica TypeScript estrito                  |
| `pnpm test`         | Executa todos os testes uma vez              |
| `pnpm build`        | Gera builds de API e web                     |
| `pnpm check`        | Executa todos os gates locais na ordem do CI |

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

# Parar os serviços preservando dados
docker compose stop

# Remover containers e rede preservando o volume
docker compose down

# Remover também os dados locais (ação destrutiva)
docker compose down --volumes
```

O volume persistente chama-se `closeflow_postgres_data`.

## Variáveis de ambiente

| Variável            | Uso                                                    |
| ------------------- | ------------------------------------------------------ |
| `NODE_ENV`          | Ambiente da API: `development`, `test` ou `production` |
| `API_PORT`          | Porta HTTP da API                                      |
| `WEB_ORIGIN`        | Origem permitida pelo CORS                             |
| `VITE_API_BASE_URL` | Prefixo usado pelo frontend para acessar a API         |
| `LOG_LEVEL`         | Nível dos logs JSON do Pino                            |
| `POSTGRES_DB`       | Banco local criado pelo container                      |
| `POSTGRES_USER`     | Usuário local do PostgreSQL                            |
| `POSTGRES_PASSWORD` | Senha exclusivamente local                             |
| `POSTGRES_PORT`     | Porta exposta somente em loopback                      |
| `DATABASE_URL`      | URL futura de acesso da aplicação ao PostgreSQL        |

A API falha no startup se `DATABASE_URL` estiver ausente. Nesta fundação a URL é validada, mas ainda não é usada por um ORM ou módulo de negócio.

## Estrutura

```text
apps/
  api/                  # API NestJS e módulos técnicos
    src/common/http/    # Problem Details e filtro global
    src/config/         # validação central do ambiente
    src/modules/health/ # liveness da API
  web/                  # aplicação React/Vite
    src/app/            # providers, Router e Error Boundary
    src/components/     # feedback visual reutilizado
    src/features/       # páginas e comportamento por feature
    src/styles/         # estilos globais e Tailwind
docs/                   # produto, arquitetura, segurança e qualidade
```

Não existe pacote compartilhado nesta fase. Um pacote só será criado após reuso concreto e fronteira estável.

## Integração contínua

O workflow `.github/workflows/ci.yml` instala exatamente o lockfile com cache do pnpm e executa:

1. formatação;
2. lint;
3. typecheck;
4. testes;
5. build.

Não há etapa de deploy.

## Solução de problemas

### `node` ou `pnpm` não é reconhecido

Instale Node 24 e habilite o pnpm com Corepack, ou instale pnpm 11 conforme a documentação oficial. Feche e reabra o terminal após alterar o `PATH`.

### Porta 3000, 5173 ou 5432 já está em uso

Altere `API_PORT` ou `POSTGRES_PORT` no `.env`. Para a porta do frontend, ajuste `apps/web/vite.config.ts`. Confirme processos e containers existentes antes de encerrá-los.

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

Toda evolução deve seguir o [AGENTS.md](AGENTS.md), os ADRs aceitos, o roadmap e a Definition of Done.
