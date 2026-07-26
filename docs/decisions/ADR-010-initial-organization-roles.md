# ADR-010 — Papéis iniciais OWNER e MEMBER

- **Status:** aceito
- **Data:** 2026-07-22

## Contexto

A Fase 4 precisa diferenciar gestão da organização e participação comum sem antecipar uma matriz RBAC completa.

## Decisão

Os únicos papéis são `OWNER` e `MEMBER`. Owner cria e renomeia organização, lista membros e remove `MEMBER`. Member lê organização/membros e pode deixar o tenant. A autorização permanece no backend e nos casos de uso.

Promoção, rebaixamento, transferência, remoção de owner e papéis financeiros ficam fora desta fase.

## Alternativas consideradas

- **RBAC configurável:** adiado por não haver casos de uso financeiros implementados.
- **Administrador global:** rejeitado porque viola o modelo multitenant.
- **Somente owner:** rejeitado porque impediria validar offboarding e autorização horizontal.

## Consequências

- UI pode ocultar ações, mas 403 é decidido no backend.
- `LAST_OWNER_REQUIRED` protege ações de owner não suportadas.
- A evolução de papéis exige regra, migration, testes e ADR quando estrutural.
