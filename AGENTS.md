# AGENTS.md — Regras permanentes do CloseFlow

Este arquivo rege todo o repositório. Instruções mais específicas podem existir em subdiretórios, mas não podem reduzir requisitos de segurança, multitenancy ou qualidade sem decisão humana explícita e ADR. Em conflito, seguir a instrução mais específica que preserve esses guardrails.

## 1. Princípios gerais

- Entenda o caso de uso e as regras antes de alterar código.
- Faça a menor mudança completa que resolva o problema; não introduza funcionalidades, dependências ou abstrações especulativas.
- Preserve mudanças existentes que não pertencem à tarefa.
- Não implemente ERP, contabilidade, Open Finance ou microsserviços sem mudança explícita de escopo.
- TypeScript deve permanecer estrito. `any`, `@ts-ignore` e casts inseguros para silenciar erros são proibidos; use `unknown`, validação e narrowing.
- Toda decisão relevante deve ser rastreável a requisito, regra, teste ou ADR.

## 2. Arquitetura

- O backend é um monólito modular conforme ADR-001.
- Organize por módulos de negócio, não por grandes pastas técnicas globais.
- Separe domínio, aplicação, infraestrutura e apresentação quando isso proteger regras, permitir teste ou isolar integração. Não crie camadas vazias.
- Dependências apontam da apresentação/infraestrutura para aplicação/domínio; domínio não conhece NestJS, HTTP ou Prisma quando isolado.
- Comunicação entre módulos usa API interna explícita ou read model deliberado. Não importe internals nem consulte tabela alheia de forma ad hoc.
- Operações críticas usam transações locais. Novos serviços, brokers, Redis ou BullMQ exigem caso concreto e decisão documentada.
- Pacotes compartilhados só existem após reuso real e fronteira estável. Proibidos depósitos genéricos `shared`, `common` ou `utils`.

## 3. Organização dos módulos

- Módulos previstos: Identity, Organizations, Companies, ClosingTemplates, Closings, Collaboration, Evidence, Issues, Reviews, Dashboard e Audit.
- Cada módulo é dono de suas invariantes, casos de uso, persistência e contrato público.
- Nomeie casos de uso por intenção (`SubmitClosingForReview`), não por CRUD genérico quando houver transição.
- Entidades/value objects só são criados quando possuem invariantes ou comportamento; DTO não é entidade.
- Evite ciclos. Se dois módulos dependem mutuamente, reveja ownership ou introduza contrato estreito no consumidor.
- Eventos de domínio/internos não justificam mensageria por si sós.

## 4. Segurança

- Negue por padrão. Autenticação e autorização são obrigatórias no backend, independentemente da interface.
- Nunca registre ou exponha senhas, tokens, cookies, segredos, connection strings, conteúdo de evidência ou PII desnecessária.
- Valide toda entrada na fronteira; use allowlist para campos, filtros, ordenação, MIME e destinos externos.
- Aplique rate limit, proteção contra enumeração e controle CSRF/XSS/SSRF conforme a superfície.
- Segredos vêm de mecanismo protegido e variáveis validadas; nunca entram no repositório ou bundle web.
- Uploads usam bucket privado, limite, tipo detectado, storage key opaca, checksum, scan/status e download temporário autorizado.
- Mudança em autenticação, autorização, tenant, upload, auditoria ou criptografia exige revisão de segurança e atualização do threat model.
- Não alegue conformidade, segurança ou criptografia sem evidência verificável.

## 5. Multitenancy

- Todo recurso de negócio pertence a uma organização direta ou transitivamente.
- Nunca confie em `organizationId`, slug, company ID ou qualquer identificador enviado pelo frontend como concessão de acesso.
- Resolva `TenantContext` a partir da identidade autenticada e de associação ativa validada no servidor.
- Toda consulta, mutação, contagem, busca, agregação, exportação, cache, job e arquivo tenant-owned deve aplicar o contexto.
- Repositórios recebem tenant explicitamente e filtram `id` e `organizationId` no mesmo predicado.
- Unicidades de negócio e relações tenant-owned incluem organização; prefira FKs compostas quando evitarem vínculo cruzado.
- IDs de outro tenant não podem revelar existência. Cliente convidado opera por allowlist de empresa.
- Query keys, caches, object keys e idempotency keys são namespaced por tenant.
- Toda feature tenant-owned inclui testes positivos e negativos com organizações A e B, inclusive listagens e agregações.

## 6. Backend

- Controllers apenas validam contrato, recebem contexto autenticado, chamam caso de uso e apresentam resultado.
- Controllers não contêm regras, transações, autorização dependente de recurso ou acesso ao Prisma.
- Prisma é restrito à infraestrutura, migrations e seed controlado.
- Casos de uso definem transação, autorização e auditoria; repositórios não ocultam comportamento global.
- Transições de estado usam comandos explícitos e verificam estado/versão esperados.
- Operações repetíveis de risco usam idempotência e constraints; concorrência crítica usa controle otimista ou condição atômica.
- API REST segue ADR-003, `/api/v1`, OpenAPI e Problem Details padronizado.
- Não exponha models Prisma; mapeie para DTO/presenter.
- Valide configuração no startup e falhe cedo. Timeouts e tratamento explícito são obrigatórios em I/O externo.

## 7. Frontend

- Organize por feature. Não replique a estrutura de camadas do backend sem necessidade.
- TanStack Query gerencia estado remoto; React Hook Form gerencia formulário; Zod valida inputs; estado local permanece local.
- Query keys sempre incluem organização ativa e filtros. Troca de organização cancela requisições e limpa dados tenant-sensitive.
- A UI pode ocultar ações por permissão, mas nunca é controle de segurança.
- Use contrato OpenAPI/tipos gerados quando disponíveis; normalize erros em um cliente HTTP único.
- Toda tela remota trata loading, vazio, erro, sucesso e sem permissão.
- Não use HTML não confiável; não armazene tokens duráveis em `localStorage` se a arquitetura usar cookies seguros.
- Tailwind/shadcn seguem tokens do produto; extraia componente apenas após padrão real.

## 8. Banco de dados

- PostgreSQL é fonte de verdade conforme ADR-004.
- Modele invariantes com `NOT NULL`, FK, unique e check constraints sempre que possível.
- Índices seguem consultas conhecidas e são validados com plano/volume; não indexe especulativamente.
- Instantes ficam em UTC; competência tem representação validada; exibição usa fuso da organização/empresa.
- Migrações são determinísticas, revisáveis e testadas do zero. Em produção, prefira expand/contract.
- Mudança destrutiva exige compatibilidade, backup/rollback e aprovação apropriada.
- Soft delete não é padrão universal; use arquivamento/retenção conforme valor histórico.
- Raw SQL é excepcional, parametrizado, tenant-safe e coberto por integração.
- App usa usuário de menor privilégio; nunca superuser. RLS só pode ser declarado após ADR e testes.

## 9. Testes

- Teste comportamento e risco, não detalhes de implementação.
- Unitários cobrem invariantes, transições, policies e cálculos.
- Integração usa PostgreSQL real descartável para repositórios, constraints, transações, migrations e isolamento.
- E2E cobre jornadas críticas e acessos negativos por papel/tenant.
- Toda correção de bug inclui regressão quando tecnicamente aplicável.
- Controle relógio, IDs e serviços externos para testes determinísticos.
- Não use snapshots extensos como substituto de asserções relevantes.
- Flaky test é defeito; não configure retry como solução permanente.
- Informe exatamente os testes executados. Nunca diga que algo passou sem evidência.

## 10. Acessibilidade

- Referência obrigatória: WCAG 2.2 AA no escopo suportado.
- Use HTML semântico, labels, nomes acessíveis, foco visível, ordem lógica e contraste adequado.
- Fluxos críticos funcionam por teclado; modais prendem/restauram foco corretamente.
- Erros são associados aos campos e não dependem só de cor/ícone.
- Respeite zoom e redução de movimento; gráficos possuem alternativa textual.
- Prefira queries por papel/nome acessível em testes e inclua automação axe equivalente, sem substituir teste manual.

## 11. Tratamento de erros

- Erros esperados são tipados e mapeados a status/código estáveis.
- Use o envelope Problem Details definido na arquitetura; inclua `correlationId`.
- Não exponha stack, SQL, caminho interno, segredo ou existência de recurso cross-tenant.
- Diferencie 401, 403, 404 seguro, 409 e 422 com semântica consistente.
- No frontend, preserve entrada após erro recuperável, associe erros de campo e ofereça próxima ação.
- Não capture e ignore erro. Registre contexto seguro ou propague para o boundary responsável.
- Retry só para falhas transitórias e operações idempotentes, com limite e backoff.

## 12. Observabilidade e auditoria

- Logs são estruturados e incluem correlação, serviço/módulo, ação, resultado e tenant interno quando seguro.
- Redija campos sensíveis na origem. Não serialize request/response completos por padrão.
- Métricas cobrem latência, volume, erro e saturação dos caminhos críticos; evite labels de alta cardinalidade.
- Traces/correlação atravessam integrações e jobs quando existirem.
- Health indica vida; readiness verifica capacidade de servir sem causar carga excessiva.
- Operações sensíveis geram AuditEvent append-only para usuários comuns, preferencialmente na mesma transação.
- Novo alerta precisa owner e runbook; não criar alerta sem ação possível.

## 13. Git e commits

- Trabalhe em branch curta com prefixo `codex/` quando uma branch precisar ser criada, salvo orientação diferente.
- Antes de editar, verifique `git status`; nunca descarte alteração alheia.
- Commits devem ser pequenos, coerentes e seguir Conventional Commits (`feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `perf`, `style`).
- Título imperativo, objetivo, em português do Brasil e com no máximo 72 caracteres.
- Corpo obrigatório para commits não triviais, com seções `Contexto`, `Problema`, `Solução`, `Resultados` e `Validação`, usando listas com hífen.
- Não misture refatoração ampla com feature; não faça commit de segredos, `.env`, artefatos ou arquivos gerados indevidos.
- Não reescreva histórico compartilhado, force push, commit ou publique sem solicitação explícita.
- Pull requests seguem o template/instruções do repositório, descrevem somente o diff real e não fazem merge automático.

## 14. Documentação

- Documentação é parte da entrega e permanece em português do Brasil, preservando nomes técnicos em inglês quando útil.
- Atualize visão/escopo/regras quando o comportamento muda; arquitetura e threat model quando fronteiras mudam; roadmap quando sequência muda.
- Decisão estrutural relevante requer ADR com contexto, decisão, alternativas e consequências. ADR aceito não é reescrito para ocultar mudança; crie ADR substituto.
- OpenAPI deve corresponder à API entregue e passar validação em CI.
- Exemplos não contêm dados reais/sensíveis e comandos precisam ser reproduzíveis.
- Links internos e nomes de arquivos devem ser verificados.

## 15. Fluxo obrigatório de execução das tarefas

1. **Entender:** leia solicitação, documentação relevante e `AGENTS.md` aplicáveis; identifique critérios e fora de escopo.
2. **Inspecionar:** verifique estrutura, estado do Git, código/testes relacionados e mudanças existentes antes de editar.
3. **Analisar riscos:** identifique impacto em tenant, autorização, dados, migração, acessibilidade, compatibilidade e operação.
4. **Planejar:** divida em passos verificáveis; declare premissas e decisões pendentes. Peça decisão humana apenas quando uma escolha material não puder ser inferida com segurança.
5. **Implementar incrementalmente:** siga as fronteiras, mantenha diff focado e não instale dependência sem justificativa e autorização de escopo.
6. **Testar durante a mudança:** comece pelo nível mais próximo e amplie conforme risco; sempre inclua casos negativos de tenant/autorização quando aplicáveis.
7. **Revisar:** leia o diff completo; procure `any`, bypass de auth/tenant, segredo, erro engolido, código morto, migration perigosa e docs desatualizadas.
8. **Validar:** execute lint, typecheck, testes, build, OpenAPI e scans aplicáveis; registre comandos e resultados reais.
9. **Documentar:** atualize arquivos e ADRs afetados; explicite limitações e riscos restantes.
10. **Entregar:** resuma resultado, arquivos relevantes, validação e pendências. Não faça commit, push, PR, deploy ou ação externa sem pedido do usuário.

## 16. Checklist rápido antes de concluir

- [ ] Escopo e regras atendidos sem expansão indevida.
- [ ] Isolamento e autorização verificados com casos negativos.
- [ ] Sem `any`, segredo, Prisma em controller ou regra na apresentação.
- [ ] Erros, logs e auditoria são seguros e correlacionáveis.
- [ ] Testes e gates aplicáveis executados e reportados com honestidade.
- [ ] Acessibilidade e estados de UI avaliados.
- [ ] Documentação/ADR/OpenAPI atualizados.
- [ ] Diff revisado e mudanças alheias preservadas.
