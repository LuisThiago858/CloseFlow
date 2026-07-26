# ADR-011 — Ausência de RLS na Fase 4

- **Status:** aceito
- **Data:** 2026-07-22

## Contexto

PostgreSQL RLS pode adicionar defesa em profundidade, mas Prisma usa pool e exigiria contexto transacional confiável, usuário sem bypass e políticas testadas. Essa infraestrutura não existe ainda.

## Decisão

Não habilitar RLS na Fase 4. Os controles compensatórios são sessão e membership validados, `TenantContext` explícito, predicados compostos, DTOs allowlist, respostas 404 seguras, caches namespaced e testes negativos A/B.

## Alternativas consideradas

- **RLS imediato:** rejeitado porque uma configuração incompleta daria segurança aparente e poderia vazar contexto entre conexões.
- **Usuário superuser com policies:** rejeitado porque permitiria bypass.
- **Nenhuma defesa no banco:** rejeitado; FKs, unique, checks e trigger diferida protegem integridade.

## Consequências

- Toda nova feature tenant-owned precisa demonstrar filtros e testes A/B.
- Raw SQL exige revisão específica.
- Adoção futura de RLS requer ADR substituto, prova com pooling/`SET LOCAL`, migrations e testes que falhem sem contexto.
