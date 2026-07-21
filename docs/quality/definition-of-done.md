# Definition of Done

Uma entrega só está concluída quando todos os itens aplicáveis estão atendidos. Exceções têm justificativa, risco, responsável e prazo registrados.

## Produto e escopo

- Critérios de aceitação e fora de escopo estão claros.
- Regras de negócio afetadas estão identificadas e consistentes.
- Estados vazios, erros, permissões e casos de borda foram considerados.
- Texto e comportamento são compreensíveis para a persona-alvo.

## Arquitetura e código

- Alteração respeita monólito modular e direção de dependências.
- Controllers não contêm regra nem acessam Prisma.
- Não há `any`, abstração especulativa, dependência circular ou pacote genérico sem uso.
- Typecheck estrito, lint, formatação e build passam.
- API/OpenAPI e cliente tipado estão sincronizados quando aplicável.
- Mudança estrutural está registrada em ADR ou documentação relevante.

## Segurança e multitenancy

- Autenticação e autorização são aplicadas no backend.
- Toda operação tenant-owned usa contexto validado e filtro de organização.
- Caso positivo e negativo entre organizações A/B foram testados.
- Inputs, outputs, uploads e erros foram validados e não vazam informação.
- Segredos e PII não aparecem em código, frontend, fixtures ou logs.
- Operações sensíveis geram auditoria atômica e redigida.
- Enquanto o módulo Audit não existe, autenticação registra somente eventos estruturados redigidos; essa limitação impede considerar auditoria completa pronta para produção.
- Threat model foi atualizado se a superfície mudou.

## Dados

- Migration é revisável, determinística e testada do zero.
- Prisma Client e schema são gerados/validados; `migrate deploy` e `migrate status` passam no banco descartável.
- Testes de integração usam `DATABASE_URL_TEST`, confirmam migrations aplicadas e não deixam tabelas demonstrativas indevidas.
- Constraints e índices sustentam invariantes e consultas conhecidas.
- Mudança destrutiva tem estratégia de compatibilidade, backup/rollback ou expand/contract.
- Retenção, exclusão e compatibilidade histórica foram consideradas.

## Testes

- Unitários cobrem regras e casos de erro relevantes.
- Integração cobre persistência, transação e isolamento quando aplicável.
- E2E cobre jornada crítica nova/alterada proporcionalmente ao risco.
- Alterações de autenticação cobrem cookie, expiração, revogação, enumeração, CSRF/origem, rate limit e reload no navegador.
- Concorrência, idempotência e falha externa foram testadas quando relevantes.
- Todos os gates obrigatórios passam sem flaky conhecido não tratado.

## UX e acessibilidade

- Interface possui loading, vazio, erro, sucesso e sem permissão.
- Fluxo crítico funciona por teclado, com foco, rótulos e mensagens adequados.
- Contraste e zoom atendem WCAG 2.2 AA no escopo.
- Layout relevante foi verificado em tamanhos suportados.
- Ação destrutiva/irreversível tem confirmação e feedback.

## Observabilidade e operação

- Logs estruturados têm correlação e tenant seguro, sem conteúdo sensível.
- Métricas/alertas são adicionados para novo caminho crítico ou falha operacional relevante.
- Erros externos têm timeout, tratamento e retry/idempotência quando necessário.
- Runbook/configuração/deploy são atualizados quando a operação muda.
- Feature flag e plano de rollback existem quando o risco exigir.

## Documentação e entrega

- README, docs, ADRs, OpenAPI e exemplos afetados estão atualizados.
- PR explica contexto, problema, solução, resultados, riscos e validação real.
- Commits seguem Conventional Commits e não misturam mudanças sem relação.
- Nenhum segredo, arquivo gerado indevido ou dependência não aprovada foi incluído.
- Critérios de aceitação foram demonstrados e revisão obrigatória concluída.
