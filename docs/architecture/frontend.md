# Arquitetura do frontend

## Princípios

- Organizar por funcionalidades do produto, não por categorias técnicas globais.
- Estado remoto pertence ao TanStack Query; estado de formulário ao React Hook Form; estado local permanece local.
- Autorização visual melhora UX, mas o backend é a autoridade.
- Componentes devem ser acessíveis, previsíveis e reutilizados somente após necessidade real.

## Estrutura proposta

```text
src/
  app/                 # providers, router, query client, error boundaries
  features/
    auth/
    organizations/
    companies/
    templates/
    closings/
    reviews/
    dashboard/
  components/          # composição compartilhada comprovada
  lib/                 # cliente HTTP, schemas e utilidades delimitadas
  styles/
```

Cada feature pode conter `routes`, `components`, `queries`, `mutations`, `schemas` e testes. Evitar barrels amplos e dependências circulares entre features.

## Rotas e navegação

- React Router com layouts para autenticação e aplicação.
- A implementação atual oferece `/login`, `/register` e `/app`; `/app` é uma rota protegida temporária, sem dashboard de negócio.
- Organização ativa aparece em contexto navegável e é validada pelo servidor.
- Rotas sugeridas: `/login`, `/org/:orgSlug/dashboard`, `/companies`, `/templates`, `/closings/:closingId`, `/reviews` e `/settings/members`.
- IDs/slugs da URL não concedem acesso; respostas `404/403` devem ter experiência segura.
- Filtros relevantes do dashboard ficam na URL para compartilhamento e retorno.

## Dados e contratos

- Cliente HTTP único adiciona correlação e credenciais adequadas, normaliza Problem Details e trata sessão expirada.
- Todas as chamadas usam `credentials: include`; o estado de autenticação é a query `['auth', 'me']` e nunca contém o token opaco.
- Tipos de transporte são preferencialmente gerados do OpenAPI.
- Zod valida entradas de formulário e, em fronteiras de risco, respostas externas; não duplicar todas as regras do domínio.
- Query keys incluem organização ativa e filtros para impedir colisões de cache.
- Queries globais usam `['auth', 'me']` e `['organizations']`; dados tenant-scoped começam por `['organization', organizationId]`.
- Ao trocar de organização, cancelar requisições e remover somente queries do tenant anterior, preservando caches globais e dados de outros tenants não selecionados.
- Somente o UUID da organização selecionada é persistido em `localStorage`; sessão, papel e dados da organização sempre vêm da API.
- Mutations invalidam chaves específicas; optimistic update apenas com rollback simples e benefício claro.

## Formulários

- React Hook Form + Zod para validação imediata e mensagens em português claro.
- Erros do servidor são mapeados a campos quando seguro; erro global permanece visível.
- Preservar dados após falha recuperável e impedir submissão duplicada.
- Ações destrutivas ou irreversíveis exigem confirmação proporcional ao risco.

## Componentes e estilo

- Tailwind CSS e shadcn/ui fornecem base, mas tokens do CloseFlow definem cor, espaço, tipografia, foco e estados.
- Não editar componentes vendorizados sem registrar a divergência; compor wrappers quando houver regra recorrente.
- Tabelas devem suportar teclado, cabeçalhos semânticos, estados vazios, loading e erro.
- Dashboard deve oferecer explicação textual e navegação, não depender apenas de cor ou gráfico.

## Acessibilidade

- Referência WCAG 2.2 AA: navegação por teclado, foco visível, contraste, nomes acessíveis e estrutura semântica.
- Modais gerenciam foco; mensagens de erro são associadas aos campos; atualizações importantes usam regiões ao vivo com moderação.
- Ícones não substituem rótulos sem nome acessível.
- Respeitar redução de movimento e zoom; testar fluxos críticos com teclado e automação de acessibilidade.

## Estados de interface

Toda tela remota relevante considera: carregando, vazio, sucesso, erro, sem permissão e dados parcialmente indisponíveis. Skeletons não devem ocultar falhas indefinidamente. Operações demoradas informam progresso e resultado.

## Segurança no cliente

- Tokens não são armazenados em `localStorage` ou `sessionStorage`; o navegador gerencia exclusivamente o cookie `HttpOnly`.
- Login e cadastro não diferenciam tecnicamente e-mail inexistente de senha incorreta na mensagem de credenciais.
- Não renderizar HTML não confiável; comentários começam como texto simples.
- Não incluir segredos no bundle ou logs.
- Downloads usam URLs temporárias obtidas após autorização.
- Cabeçalhos de segurança e CSP serão definidos no ambiente de entrega.

## Testes

- Unitários para funções e componentes com comportamento relevante.
- Integração com Testing Library e Mock Service Worker nos fluxos da feature.
- E2E para login, troca de organização, fechamento, evidência e revisão.
- A Fase 4 cobre onboarding, criação, reload, seleção determinística, header tenant, perda de acesso e ausência de cache cruzado.
- Testes devem priorizar comportamento acessível, não detalhes de implementação.
