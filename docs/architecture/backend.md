# Arquitetura do backend

## Organização por módulo

Estrutura de referência, aplicada apenas quando cada camada agrega valor:

```text
src/modules/closings/
  domain/           # entidades, value objects, políticas e eventos de domínio
  application/      # casos de uso, portas, DTOs internos
  infrastructure/   # Prisma, storage e adapters
  presentation/http/# controllers, DTOs HTTP, presenters
  closings.module.ts
```

CRUD simples pode usar uma estrutura menor, desde que preserve direção de dependências, autorização, isolamento e ausência de regra no controller. Não criar interfaces para cada classe por ritual.

## Responsabilidades

### Apresentação

- Declarar rotas, status HTTP e DTOs com validação.
- Ler identidade/contexto já autenticados.
- Chamar um caso de uso e converter resultado/erro.
- Não conter regra de transição, autorização de recurso, transação ou Prisma.

### Aplicação

- Implementar casos de uso orientados a intenção, como `SubmitClosingForReview`.
- Autorizar ações dependentes de recurso com policies explícitas.
- Coordenar repositórios, transações, relógio e auditoria.
- Definir limites de idempotência e concorrência.

### Domínio

- Proteger invariantes e transições com tipos e métodos significativos.
- Usar value objects para competência, estados e regras com comportamento real.
- Permanecer independente de transporte e persistência quando isso simplificar testes e evolução.

### Infraestrutura

- Mapear modelos Prisma e implementar repositórios tenant-aware.
- Integrar armazenamento, e-mail e autenticação externa.
- Traduzir falhas externas sem vazar detalhes.

## API REST

- Prefixo `/api/v1`; substantivos no plural; JSON em `camelCase`.
- Rotas aninhadas somente quando expressam ownership e não ficam excessivamente profundas.
- Comandos de domínio usam endpoints explícitos, por exemplo `POST /closings/{id}/submit-review`.
- Listagens têm paginação baseada em cursor quando a ordem for estável; filtros e ordenação são allowlisted.
- Datas/instantes usam ISO 8601; competência usa `YYYY-MM`.
- OpenAPI é gerado e validado em CI; exemplos não contêm dados sensíveis.
- Cliente do frontend pode ser gerado do contrato para evitar duplicação manual.

## Erros

Envelope baseline inspirado em Problem Details:

```json
{
  "type": "https://closeflow.example/problems/validation-error",
  "title": "Dados inválidos",
  "status": 422,
  "code": "VALIDATION_ERROR",
  "detail": "Revise os campos informados.",
  "instance": "/api/v1/closings",
  "correlationId": "...",
  "errors": { "competence": ["Formato inválido."] }
}
```

- Não expor stack trace, SQL, segredo, existência de recurso de outro tenant ou detalhes internos.
- Conflitos de constraint ou transação que não tenham semântica mais específica usam `PERSISTENCE_CONFLICT` com HTTP `409`, sem mencionar Prisma, SQL ou a constraint.
- Diferenciar autenticação (`401`), autorização (`403`), inexistência segura (`404`), conflito (`409`) e semântica inválida (`422`).
- Erros esperados são tipados; exceções inesperadas são capturadas, correlacionadas e registradas.

## Persistência e transações

- `DatabaseModule` centraliza um único `PrismaService` por processo e o exporta apenas para módulos que declaram essa dependência.
- O Prisma Client é gerado em `apps/api/src/generated/prisma`, não é versionado e deve ser regenerado antes de typecheck/build.
- Configuração do Prisma usa `DATABASE_URL`; testes de integração e migrations de teste usam `DATABASE_URL_TEST` explicitamente.
- Migrations são versionadas, aplicadas com `migrate deploy` em CI/produção e nunca reescritas depois de aplicadas. `migrate dev` é exclusivamente local.
- Prisma fica restrito à infraestrutura e scripts de migração/seeding.
- Toda operação tenant-owned inclui filtro de `organizationId` no mesmo predicado do identificador.
- Evitar primeiro buscar por `id` e depois comparar tenant quando uma consulta composta resolve atomicamente.
- Usar constraints para unicidade e integridade, além das validações da aplicação.
- Casos de uso definem fronteira transacional; não esconder transações globais em helpers.
- Atualizações concorrentes críticas usam versionamento otimista ou condição sobre estado/versão.
- Migrações seguem expansão/contração quando houver produção; rollback destrutivo exige plano.

## Saúde operacional

- `/api/v1/health/live` verifica somente o processo da API.
- `/api/v1/health/ready` e `/api/v1/health` consultam o PostgreSQL e retornam `503` quando ele está indisponível.
- Falha de configuração impede startup. Falha transitória de conexão mantém liveness disponível e readiness indisponível.
- Respostas e logs de falha nunca incluem URL, credenciais, SQL ou stack.

## Autenticação e autorização

- O módulo `Identity` implementa cadastro/login local, Argon2id e sessões opacas conforme ADR-006.
- Somente SHA-256 do token aleatório de 256 bits é persistido; o token bruto fica em cookie `HttpOnly`, `SameSite=Lax`, `Path=/` e `Secure` em produção.
- `SessionAuthGuard` consulta sessão e usuário, rejeita expiração/revogação/desativação e disponibiliza um principal tipado sem expor models Prisma.
- A validade deslizante é de sete dias, renovada nas últimas 24 horas, limitada a 30 dias absolutos; `last_used_at` é atualizado no máximo a cada 15 minutos.
- Cadastro e login usam rate limit em memória por IP/endpoint. Mais de uma instância exigirá armazenamento distribuído e revisão do proxy confiável.
- CORS aceita somente `CORS_ALLOWED_ORIGINS`; mutações validam origem/Fetch Metadata e corpos de credencial exigem JSON.
- `Organizations` importa a API pública estreita de `Identity`, resolve `TenantContext` por sessão, header, organização ativa e membership ativo e nunca consulta internals de identidade de forma ad hoc.
- `X-Organization-Id` é somente referência: `TenantContextGuard` combina `userId` autenticado e organização antes de disponibilizar `organizationId`, `membershipId` e papel tipados.
- Casos de uso aplicam autorização `OWNER`/`MEMBER` e invariantes previsíveis; o repositório Prisma específico mantém filtros compostos e traduz conflitos residuais em erros sanitizados.
- A constraint trigger diferida é a última linha de defesa para owner ativo e organização inativa, não substituto da validação de aplicação.
- RBAC é baseline, complementado por escopo de empresa e estado do recurso.
- Eventos atuais são logs estruturados redigidos. Auditoria persistente de papel, convite, aprovação e reabertura será adicionada no módulo Audit.

## Jobs e integrações

- Tarefas rápidas permanecem síncronas.
- Antes de adicionar BullMQ, documentar durabilidade, volume, retentativa, idempotência e operação do worker.
- Se um efeito externo precisar seguir um commit confiavelmente, considerar outbox transacional antes de publicar diretamente.

## TypeScript e qualidade

- `strict: true`, `noUncheckedIndexedAccess` e `exactOptionalPropertyTypes` devem ser avaliados como baseline.
- `any` é proibido; entradas desconhecidas usam `unknown` com narrowing.
- Validar variáveis de ambiente no startup e falhar de modo explícito.
- Relógio, IDs e integrações são injetáveis onde necessário para testes determinísticos.
