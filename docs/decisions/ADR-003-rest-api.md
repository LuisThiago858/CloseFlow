# ADR-003: Adotar API REST documentada com OpenAPI

- **Status:** Aceito
- **Data:** 2026-07-12

## Contexto

O MVP tem recursos e comandos transacionais claros, um frontend web principal e necessidade de contratos compreensíveis, testes e futura integração. A equipe pretende usar NestJS.

## Decisão

Expor API REST JSON versionada em `/api/v1`, documentada por OpenAPI. Recursos usam semântica HTTP; transições relevantes usam endpoints de comando explícitos. Erros seguem envelope consistente inspirado em Problem Details. O frontend deve preferir cliente/tipos gerados do contrato.

## Alternativas consideradas

- **GraphQL:** adiado porque adiciona esquema, autorização por campo, cache e controle de complexidade sem necessidade comprovada no MVP.
- **tRPC:** rejeitado como contrato externo principal por acoplar cliente e servidor TypeScript e oferecer interoperabilidade menor.
- **gRPC:** inadequado para o navegador e para a natureza inicial da API pública.

## Consequências

### Positivas

- Contrato padronizado, explorável e integrável.
- Bom suporte no NestJS, tooling e testes.
- Cache, status e observabilidade HTTP conhecidos.

### Negativas

- Risco de over/under-fetching em telas agregadas.
- Mudanças precisam disciplina de versionamento.
- Endpoints de dashboard podem demandar read models específicos.

## Guardrails

Controllers finos; paginação e filtros limitados; OpenAPI validado em CI; nenhum modelo Prisma exposto diretamente; breaking changes exigem estratégia compatível ou nova versão.
