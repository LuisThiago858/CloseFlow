# Multitenancy

## Modelo escolhido

Baseline: banco e schema PostgreSQL compartilhados, com coluna `organization_id` em todas as tabelas tenant-owned. A escolha reduz custo operacional no MVP, mantendo caminho para particionamento ou isolamento dedicado no futuro.

O isolamento não depende de uma única barreira. Aplicação, repositórios, constraints, testes e observabilidade atuam em defesa em profundidade. PostgreSQL Row-Level Security (RLS) será avaliado em uma prova antes da produção; não deve ser declarado ativo sem configuração correta de contexto e estratégia de pooling.

## Contexto de organização

1. A identidade autenticada fornece `userId` confiável.
2. As rotas tenant-scoped recebem `X-Organization-Id` e o mesmo UUID no parâmetro de rota; ausência do header retorna 400 e referência inválida retorna 422.
3. O backend combina a identidade autenticada, organização `ACTIVE` e membership `ACTIVE`, resolvendo `TenantContext` imutável com `organizationId`, `membershipId` e papel.
4. Guards/policies usam esse contexto.
5. Repositórios recebem contexto explicitamente e aplicam `organizationId` em todas as operações.

Um `organizationId` no body não substitui o contexto e é rejeitado nos contratos atuais. Identificador de outro tenant ou contexto divergente recebe 404 seguro.

Na Fase 4, `Organization` é o tenant raiz. `Membership` preserva histórico: remoção altera seu status para `INACTIVE`, e a unicidade permanente por `(organization_id, user_id)` obriga uma futura readmissão a reativar o registro existente.

## Classificação das tabelas

- **Globais:** usuário/identidade, catálogos técnicos estritamente globais.
- **De associação:** membership. Convites serão adicionados somente na Fase 4.1.
- **Tenant-owned:** empresas, modelos, fechamentos, tarefas, comentários, evidências, pendências, revisões e auditoria.

Recursos filhos podem herdar tenant pelo pai, mas é preferível repetir `organization_id` quando isso habilita constraints compostas, índices e filtros seguros. A redundância deve ser protegida por chaves compostas para evitar inconsistência.

## Regras de persistência

- Chaves únicas de negócio incluem `organization_id`.
- Relações tenant-owned usam, quando viável, FK composta `(organization_id, parent_id)`.
- Consultas por ID usam predicado conjunto, como `WHERE id = ? AND organization_id = ?`.
- `findUnique({ id })` isolado é proibido para recurso tenant-owned, salvo mecanismo central comprovadamente seguro.
- Raw SQL exige revisão específica de isolamento.
- Agregações, buscas, exports e jobs carregam tenant explícito e não reutilizam cache sem namespace.

## Autorização em dois níveis

1. **Organização:** membro ativo e papel com capacidade.
2. **Recurso:** acesso à empresa, atribuição, propriedade, estado e regras de segregação.

Cliente convidado recebe escopo allowlist por empresa; ausência de vínculo significa negação. Recursos inexistentes e de outro tenant devem produzir resposta que não facilite enumeração.

## Cache, arquivos e jobs

- Query keys e caches usam prefixo por organização e nunca armazenam resposta misturada.
- Object keys não usam apenas nomes fornecidos pelo usuário; incluem namespace não previsível e organização, sem tornar o caminho uma autorização.
- URLs assinadas têm curta duração e são emitidas após checagem atual.
- Jobs carregam `organizationId`, `actor/system context`, correlação e chave idempotente; worker revalida premissas.

## Auditoria e observabilidade

- Logs incluem `organizationId` interno, correlação e ação, mas evitam PII e conteúdo de evidência.
- Métricas devem evitar cardinalidade por organização quando isso for caro; diagnósticos tenant-specific ficam em logs/traces controlados.
- Alertas de acesso negado e anomalias não podem expor dados cruzados.

## Testes obrigatórios de isolamento

- Para cada repositório tenant-owned: organização A não lê, atualiza nem exclui dado de B.
- Listagens, contagens, filtros, autocomplete e dashboard não agregam B em A.
- IDs válidos de outro tenant não revelam existência.
- Troca de organização limpa cache no frontend e revalida sessão/contexto.
- Convites, anexos, URLs assinadas, comentários e auditoria respeitam tenant.
- Jobs e comandos repetidos não operam no contexto errado.

## Decisão sobre RLS

A Fase 4 não usa RLS. O isolamento atual depende de contexto validado, predicados compostos, respostas 404 seguras, cache namespaced e testes A/B. A decisão e os controles compensatórios estão no ADR-011; uma nova adoção exige ADR substituto e prova com Prisma/pooling.

## Avaliação futura de RLS

Antes do lançamento, executar spike com:

- definição de policies para tabelas críticas;
- contexto definido por transação (`SET LOCAL`) e compatibilidade com Prisma/pool;
- comportamento de migrations, jobs e usuário administrativo separado;
- testes que falham quando o contexto não existe;
- plano contra bypass por owner/superuser.

Se RLS não for adotado, registrar ADR com controles compensatórios e evidências de testes.

## Evolução

Organizações com requisitos de residência, chaves dedicadas ou grande volume podem motivar database-per-tenant no futuro. Essa migração exige roteamento, provisionamento, backup, analytics e operação próprios; não será antecipada no MVP.
