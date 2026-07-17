# ADR-005: Definir convenções iniciais de persistência

- **Status:** Aceito
- **Data:** 2026-07-13

## Contexto

O ADR-004 definiu PostgreSQL e Prisma, mas não fixou convenções de nomes, identificadores, tempo, dinheiro, exclusão e evolução das migrations. Antecipar tabelas de negócio sem casos de uso validados criaria um contrato prematuro; deixar as convenções indefinidas produziria inconsistência nas próximas fases.

## Decisão

- PostgreSQL usa tabelas e colunas em `snake_case`; models e campos TypeScript usam `PascalCase` e `camelCase`, com `@@map` e `@map` quando necessário.
- Novas entidades usam UUID como chave primária opaca. IDs não são mecanismo de autorização.
- Instantes são armazenados em UTC com `timestamptz`; competência mensal continua sendo um conceito próprio, não um instante improvisado.
- Valores monetários usam `Decimal` com precisão e escala definidas pelo caso de uso. `float` e `double` não são aceitos para dinheiro.
- Recursos tenant-owned terão `organization_id` direto ou vínculo transitivo protegido; constraints e consultas devem impedir relações cruzadas.
- `created_at` e `updated_at` são usados quando o ciclo de vida exigir. Campos de ator são adicionados somente com valor de auditoria.
- Não haverá `BaseEntity`, repositório genérico ou soft delete universal. Arquivamento e exclusão serão decididos por recurso e política de retenção.
- Escritas dependentes e operações sensíveis usam transações locais definidas pelo caso de uso.
- Migrations aplicadas são imutáveis. Correções usam nova migration e produção segue expand/contract quando houver risco de compatibilidade.

## Alternativas consideradas

- **ULID como identificador:** adiado; UUID possui suporte direto e reduz uma decisão operacional sem benefício comprovado nesta fase.
- **Nomes iguais entre banco e TypeScript:** rejeitado por conflitar com convenções idiomáticas de cada ambiente.
- **BaseEntity e soft delete globais:** rejeitados porque escondem diferenças de ciclo de vida, retenção e auditoria.
- **Criar tabelas demonstrativas na migration inicial:** rejeitado para não cristalizar entidades antes dos casos de uso.

## Consequências

### Positivas

- Próximas migrations partem de convenções previsíveis e revisáveis.
- Tipos de tempo e dinheiro evitam perdas semânticas conhecidas.
- Exclusão, tenancy e transações permanecem decisões explícitas do domínio.

### Negativas

- Models Prisma exigirão mappings entre nomes TypeScript e PostgreSQL.
- Precisão monetária e regras de retenção ainda precisam ser definidas por contexto.
- UUID não ordena por tempo por padrão; índices dependerão das consultas reais.

## Guardrails

A migration inicial permanece vazia; nenhuma entidade de negócio é autorizada por este ADR. Toda futura tabela tenant-owned exige revisão de isolamento, constraints compostas quando aplicáveis e testes positivos/negativos entre organizações.
