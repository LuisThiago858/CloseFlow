# ADR-004: Adotar PostgreSQL com Prisma

- **Status:** Aceito
- **Data:** 2026-07-12

## Contexto

Fechamentos possuem relações, constraints, transições, histórico e necessidade de transações fortes e consultas agregadas. Multitenancy demanda filtros, índices e integridade robustos. A stack pretendida inclui Prisma.

## Decisão

Usar PostgreSQL como fonte de verdade e Prisma ORM na infraestrutura do backend. O MVP usa banco/schema compartilhado com `organization_id`. Constraints, transações e índices complementam as regras da aplicação. RLS será avaliado antes da produção em decisão separada.

## Alternativas consideradas

- **Banco documental:** rejeitado porque relações, unicidade, auditoria e consultas do domínio favorecem modelo relacional.
- **Database-per-tenant desde o início:** adiado pelo custo de provisionamento, migração e operação sem requisito de isolamento físico.
- **SQLite no desenvolvimento:** rejeitado como substituto principal por diferenças de concorrência, tipos e SQL; testes de integração usam PostgreSQL.
- **SQL direto como padrão:** rejeitado por produtividade/tipagem, permanecendo opção excepcional para consultas justificadas e parametrizadas.

## Consequências

### Positivas

- Integridade relacional, transações ACID e consultas maduras.
- Prisma fornece schema, migrações e cliente tipado.
- Caminho para RLS, JSONB, índices e otimização quando necessários.

### Negativas

- Prisma não garante isolamento automaticamente.
- Migrações e pooling precisam disciplina operacional.
- Consultas complexas podem exigir SQL especializado.

## Guardrails

Prisma nunca aparece em controllers; recursos tenant-owned filtram por organização; unicidades incluem tenant; raw SQL é revisado e testado; app não usa superuser; migrations são aplicadas e testadas em CI.
