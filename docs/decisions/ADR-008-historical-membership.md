# ADR-008 — Membership explícito e histórico

- **Status:** aceito
- **Data:** 2026-07-22

## Contexto

O vínculo entre usuário e organização precisa sustentar autorização e preservar remoções sem criar identidades duplicadas ou perder rastreabilidade.

## Decisão

`Membership` é uma relação explícita com role `OWNER`/`MEMBER`, status `ACTIVE`/`INACTIVE` e unicidade permanente por `(organization_id, user_id)`. Remoção no domínio persiste `INACTIVE`; nenhum endpoint executa exclusão física.

Uma repetição de offboarding sobre o mesmo `MEMBER` inativo retorna 204 sem nova escrita. Retorno futuro deve reativar atomicamente o registro existente, atualizando role, status, ingresso e timestamps.

## Alternativas consideradas

- **Apagar e recriar:** rejeitado por perder história e permitir múltiplos vínculos.
- **Unique parcial somente para ativos:** rejeitado porque permitiria duplicação histórica.
- **Papel no usuário:** rejeitado porque papel varia por organização.

## Consequências

- Convites e reativação ficam na Fase 4.1.
- Owner não pode ser removido ou deixar a organização nesta fase.
- FKs usam `RESTRICT` para impedir apagamento acidental de identidade ou tenant.
