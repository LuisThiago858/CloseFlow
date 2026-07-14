# ADR-002: Adotar monorepo com pnpm workspaces

- **Status:** Aceito
- **Data:** 2026-07-12

## Contexto

Frontend, backend, cliente da API e configurações precisam evoluir de forma coordenada. O projeto começa pequeno e se beneficia de mudanças atômicas e uma experiência única de desenvolvimento.

## Decisão

Usar um monorepo com `pnpm` workspaces. Aplicações ficam em `apps/web` e `apps/api`; pacotes só são criados para contrato, configuração ou componente com reuso concreto. O lockfile é único e CI executa gates por workspace/impacto quando útil.

## Alternativas consideradas

- **Repositórios separados:** rejeitados no início por aumentar coordenação, versionamento de contrato e mudanças cruzadas.
- **npm/yarn workspaces:** viáveis, mas pnpm foi escolhido por eficiência de instalação, workspace protocol e alinhamento com a stack pretendida.
- **Ferramenta de build distribuído desde o início:** adiada; será adotada apenas quando tempos de CI justificarem.

## Consequências

### Positivas

- Uma PR pode atualizar API, cliente, UI e documentação atomicamente.
- Padronização de TypeScript, lint e testes.
- Instalação determinística e deduplicação eficiente.

### Negativas

- CI e ownership precisam evitar acoplamento indiscriminado.
- Pacotes internos podem virar depósitos genéricos.
- Permissões por repositório não separam equipes.

## Guardrails

Sem pacote `shared/common/utils` sem fronteira e consumidores comprovados. Dependências entre workspaces são explícitas; ciclos são proibidos; nenhum pacote importa internals de aplicação.
