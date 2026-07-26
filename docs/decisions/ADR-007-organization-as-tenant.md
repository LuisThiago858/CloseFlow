# ADR-007 — Organização como tenant raiz

- **Status:** aceito
- **Data:** 2026-07-22

## Contexto

O CloseFlow precisa separar clientes sem introduzir banco ou schema por cliente. A identidade é global e um usuário pode atuar em mais de uma organização.

## Decisão

`Organization` é o tenant raiz. Toda organização nasce `ACTIVE` com um membership `ACTIVE/OWNER` na mesma transação. Recursos futuros pertencem a uma organização direta ou transitivamente e repositórios recebem o tenant explicitamente.

Não existe endpoint para alterar status nesta fase. Organização `ACTIVE` termina toda transação com owner ativo; organização `INACTIVE` não pode manter memberships ativos.

## Alternativas consideradas

- **Tenant por usuário:** rejeitado porque impede BPOs e equipes multiorganização.
- **Database/schema por tenant:** adiado pelo custo operacional prematuro.
- **Slug como autorização:** rejeitado; slug é somente identificador público imutável.

## Consequências

- Consultas tenant-owned combinam recurso e `organization_id`.
- Slug é globalmente único, mas não concede acesso.
- Desativação transacional será definida em fase futura.
