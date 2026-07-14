# Multitenancy

## Modelo escolhido

Baseline: banco e schema PostgreSQL compartilhados, com coluna `organization_id` em todas as tabelas tenant-owned. A escolha reduz custo operacional no MVP, mantendo caminho para particionamento ou isolamento dedicado no futuro.

O isolamento não depende de uma única barreira. Aplicação, repositórios, constraints, testes e observabilidade atuam em defesa em profundidade. PostgreSQL Row-Level Security (RLS) será avaliado em uma prova antes da produção; não deve ser declarado ativo sem configuração correta de contexto e estratégia de pooling.

## Contexto de organização

1. A identidade autenticada fornece `userId` confiável.
2. A rota, subdomínio ou seletor envia uma referência de organização.
3. O backend consulta associação ativa e resolve `TenantContext` imutável com `organizationId`, `membershipId`, papel e escopos.
4. Guards/policies usam esse contexto.
5. Repositórios recebem contexto explicitamente e aplicam `organizationId` em todas as operações.

Um `organizationId` no body não substitui o contexto. Quando o contrato aceitar esse campo por necessidade, ele deve coincidir com o contexto validado ou ser ignorado/rejeitado.

## Classificação das tabelas

- **Globais:** usuário/identidade, catálogos técnicos estritamente globais.
- **De associação:** membership e convite, sempre relacionados a uma organização.
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

## Avaliação de RLS

Antes do lançamento, executar spike com:

- definição de policies para tabelas críticas;
- contexto definido por transação (`SET LOCAL`) e compatibilidade com Prisma/pool;
- comportamento de migrations, jobs e usuário administrativo separado;
- testes que falham quando o contexto não existe;
- plano contra bypass por owner/superuser.

Se RLS não for adotado, registrar ADR com controles compensatórios e evidências de testes.

## Evolução

Organizações com requisitos de residência, chaves dedicadas ou grande volume podem motivar database-per-tenant no futuro. Essa migração exige roteamento, provisionamento, backup, analytics e operação próprios; não será antecipada no MVP.
