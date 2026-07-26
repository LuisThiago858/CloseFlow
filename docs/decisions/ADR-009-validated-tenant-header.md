# ADR-009 — Contexto tenant por header validado

- **Status:** aceito
- **Data:** 2026-07-22

## Contexto

O frontend precisa trocar de organização sem subdomínios, e identificadores fornecidos pelo cliente não podem se transformar em autorização.

## Decisão

Rotas tenant-scoped exigem `X-Organization-Id` igual ao parâmetro da rota. O backend combina esse UUID com o `userId` da sessão, organização `ACTIVE` e membership `ACTIVE`, produzindo `TenantContext` tipado.

Header ausente retorna 400 `ORGANIZATION_CONTEXT_REQUIRED`; UUID, parâmetro ou payload inválido retorna 422; organização inacessível, inativa ou divergente retorna 404 seguro.

## Alternativas consideradas

- **Body/query:** rejeitado por misturar contexto com dados mutáveis e filtros.
- **Slug/subdomínio:** adiado; não elimina a validação de membership.
- **Tenant na sessão:** rejeitado porque a sessão é global e a troca não deve gerar nova credencial.

## Consequências

- Controllers recebem principal e contexto resolvidos, sem confiar no header.
- OpenAPI documenta o header em toda rota aplicável.
- A sessão continua válida após perder acesso a um tenant.
