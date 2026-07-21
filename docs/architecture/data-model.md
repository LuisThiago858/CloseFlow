# Modelo de dados conceitual

Este documento orienta o desenho. A baseline da Fase 2 permanece vazia; a Fase 3 materializa somente `users` e `sessions`. Demais nomes e cardinalidades devem ser validados antes de cada migration de domínio.

## Convenções

- IDs opacos em UUID e nunca expostos como mecanismo de segurança.
- Tabelas e colunas usam `snake_case`; models e campos TypeScript usam `PascalCase` e `camelCase` com mappings explícitos.
- Tabelas tenant-owned contêm `organization_id` e índices iniciados por ele quando compatível com a consulta.
- Instantes, incluindo `created_at` e `updated_at`, usam `timestamptz` em UTC; `created_by`/`updated_by` existem quando houver valor de auditoria.
- Dinheiro usa `Decimal`, com precisão e escala definidas pelo contexto antes da migration.
- `archived_at`/`deleted_at` apenas onde a política exigir; não aplicar soft delete universal.
- Não usar `BaseEntity` ou repositório genérico; escritas dependentes têm fronteira transacional explícita.
- Estados persistidos como enums estáveis ou texto com constraint; alterações requerem migração deliberada.
- Documento fiscal, se coletado, precisa normalização, criptografia/mascaramento conforme risco e minimização.

## Identidade e tenancy

### User

Identidade global já implementada: UUID, `email`, `normalized_email` único, `password_hash`, estado `ACTIVE`/`DISABLED`, criação, atualização e último login. O estado usa texto com `CHECK`, permitindo evolução deliberada por migration sem enum PostgreSQL. Não contém papel global, perfil pessoal ou organização.

### Session

Sessão global já implementada: UUID, usuário, SHA-256 do token opaco, criação, última atividade, expiração, revogação e motivo. O token bruto, IP, User-Agent e fingerprint não são persistidos. Índices sustentam lookup único pelo hash e listagem das sessões do usuário.

### Organization

Tenant: `id`, nome, slug/referência, fuso horário, estado e configurações versionadas essenciais.

### Membership

Relaciona usuário e organização: papel predefinido, estado, datas de ingresso/revogação. Único por `(organization_id, user_id)` para vínculo vigente, conforme estratégia histórica.

### Invitation

Organização, e-mail normalizado, papel proposto, token armazenado como hash, expiração, autor, aceite/revogação. Token nunca é salvo em texto puro.

### CompanyAccess

Allowlist entre membership e empresa para convidados e, se necessário, membros com escopo restrito. A autorização continua verificando estado de todos os vínculos.

## Empresas e modelos

### Company

Empresa gerenciada: organização, nome, identificador interno, documento opcional, fuso opcional, estado e responsáveis. Único por `(organization_id, internal_code)`.

### ClosingTemplate

Cabeçalho lógico: organização, nome, descrição, estado e versão vigente.

### TemplateVersion

Versão imutável publicável: template, número, snapshot/configuração, autor e instante. Alternativamente etapas/tarefas versionadas em tabelas; decisão depende da necessidade de consulta.

### TemplateStage / TemplateTask

Estrutura ordenada, instruções, obrigatoriedade, prioridade, prazo relativo, evidência exigida e regra de responsável sugerido.

## Execução do fechamento

### Closing

Organização, empresa, competência, categoria/template/version, estado, datas-base, prazo, progresso derivado, versão de concorrência e ciclos de revisão. Constraint candidata: `(organization_id, company_id, competence, closing_type)`.

### ClosingStage / ClosingTask

Snapshot executável do modelo. Guardam título/instruções originais, ordem, obrigatoriedade, estado, prioridade, prazo, responsável, conclusão e versão. A instância não referencia textos mutáveis do template como fonte da verdade.

### Comment

Organização, autor, corpo em texto, recurso-alvo tipado, criação e edição lógica. Relações polimórficas precisam integridade explícita; preferir tabelas de vínculo ou alvos limitados.

### Evidence

Metadados: organização, tarefa/pendência/revisão, storage key opaca, nome exibido, MIME detectado, tamanho, checksum, estado de scan/upload, autor e timestamps. Binário não reside no banco.

### Issue

Organização, fechamento, tarefa opcional, descrição, severidade, estado, bloqueante, responsável, prazo, resolução e verificação.

### ReviewCycle / ReviewDecision

Cada submissão cria ciclo/versionamento. Decisões registram tipo (`APPROVED`/`CHANGES_REQUESTED`), revisor, justificativa, instante e snapshot/versão do fechamento revisado.

## Governança

### AuditEvent

Evento append-only: organização opcional para ação global, ator, tipo de ator, ação, tipo/id de recurso, resultado, timestamp, correlação, IP/agent com retenção apropriada e mudanças seguras/redigidas em JSON. Índices por organização+tempo, recurso e ator conforme consultas.

### IdempotencyKey

Quando necessário: organização, ator/escopo, chave, operação, hash da requisição, resultado e expiração. Evita duplicação de comandos críticos.

## Relações principais

```text
User --< Session
 |
 +--< Membership >-- Organization --< Company
                              |             |
                              |             +--< Closing --< ClosingStage --< ClosingTask
                              |                              |                 |
                              +--< ClosingTemplate           |                 +-- Evidence
                                      |                      +-- Issue
                                      +--< TemplateVersion   +-- ReviewCycle --< ReviewDecision
                                             |               +-- Comment
                                             +--< TemplateStage --< TemplateTask
```

## Índices e integridade iniciais

- Membership por usuário e organização/estado.
- Company por organização, estado e identificador.
- Closing por organização+competência+estado, empresa+competência e responsável via tarefas.
- ClosingTask por organização+responsável+estado+prazo e fechamento+ordem.
- Issue por organização+estado+prazo.
- AuditEvent por organização+timestamp descendente e recurso.
- Constraints compostas impedem relação entre pais e filhos de tenants distintos.

Índices finais dependem de `EXPLAIN ANALYZE` e padrões reais; evitar indexação especulativa excessiva.

## Retenção e privacidade em aberto

Definir antes da produção: retenção por classe, direito de exclusão aplicável, legal hold, backup, restauração, descarte de anexos, anonimização de usuário desligado e exportação. Auditoria e evidências podem exigir prazos diferentes.
