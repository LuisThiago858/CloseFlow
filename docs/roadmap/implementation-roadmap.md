# Roadmap de implementação

## Regras do roadmap

- Fases são sequenciais apenas quando há dependência técnica; trabalho interno pode ser fatiado em PRs menores.
- Cada fase entrega comportamento demonstrável, documentação e testes.
- Critérios de conclusão são gates, não previsões de data.
- Descobertas podem alterar fases mediante atualização deste documento e ADR quando necessário.
- Piloto com dados reais só ocorre depois dos gates de segurança e operação.

## Fase 0 — Descoberta e decisões bloqueantes

**Objetivo:** validar o problema, vocabulário, fluxo e escolhas que afetam identidade, dados e operação.

**Funcionalidades/entregáveis:** entrevistas com perfis; protótipo navegável dos fluxos críticos; glossário; matriz RBAC; definição de fechamento/tipo/competência; decisão de autenticação; classificação de dados; retenção preliminar; escolha de cloud, storage e região; ADR sobre RLS após spike.

**Dependências:** acesso a clientes-piloto e responsáveis de produto, segurança e infraestrutura.

**Riscos:** construir workflow incorreto; subestimar acesso de cliente; requisitos LGPD tardios; provedor incompatível com multiorganização.

**Critérios de aceitação:** ao menos representantes de BPO, executor e revisor validam a jornada; estados e transições são aprovados; riscos críticos têm owner; decisões bloqueantes estão documentadas.

**Testes necessários:** testes de usabilidade do protótipo; walkthrough de ameaça; spike técnico de auth/RLS/storage; revisão da matriz de permissões por cenários.

**Condição de conclusão:** não há decisão desconhecida que impeça modelar identidade, tenant, fechamento e evidência; premissas restantes têm plano explícito.

## Fase 1 — Fundação do monorepo e ambiente local

**Objetivo:** estabelecer uma base compilável, reproduzível e observável sem funcionalidade de negócio.

**Funcionalidades/entregáveis:** pnpm workspaces; `apps/web` e `apps/api`; configurações TypeScript estritas; lint/format; Docker Compose com PostgreSQL; validação de ambiente; liveness inicial; testes base; OpenAPI vazio versionado; CI inicial.

**Dependências:** decisões de versões suportadas, Node/pnpm e infraestrutura local.

**Riscos:** tooling excessivo, divergência local/CI, segredos em compose e presets compartilhados prematuros.

**Critérios de aceitação:** clone limpo sobe banco, API e web por comandos documentados; typecheck/lint/test/build passam; liveness confirma o processo; nenhuma dependência sem justificativa.

**Testes necessários:** smoke de startup; validação de env ausente; health básico; build de produção; execução dos gates em CI.

**Condição de conclusão:** pipeline verde e onboarding técnico reproduzido por outra pessoa seguindo somente o README.

## Fase 2 — Fundação de persistência e migrations

**Objetivo:** estabelecer acesso tipado e verificável ao PostgreSQL sem antecipar entidades de negócio.

**Funcionalidades/entregáveis:** Prisma 7 com adapter PostgreSQL; `DatabaseModule` e um único `PrismaService`; schema sem models; migration baseline vazia; seed vazio; scripts de geração, validação, migrations, status, studio e reset local protegido; banco de integração descartável; liveness/readiness; CI com PostgreSQL real; convenções registradas no ADR-005.

**Dependências:** Fase 1; PostgreSQL 17; URLs locais separadas para desenvolvimento e testes.

**Riscos:** vazamento de credenciais em erro/log; teste apagar banco incorreto; divergência entre schema e migration; client gerado desatualizado; health confundir processo com dependência.

**Critérios de aceitação:** schema válido sem models; migration aplica do zero e cria apenas `_prisma_migrations`; API consulta o banco; liveness independe do PostgreSQL; readiness/health retornam `503` seguro quando indisponível; scripts e CI usam comandos adequados por ambiente.

**Testes necessários:** unitários de configuração, guard de reset e health; integração real de módulo, conexão, `SELECT 1`, migration e endpoints; teste de não vazamento; lint, typecheck, testes, build e `pnpm check` completos.

**Condição de conclusão:** onboarding documentado reproduz os bancos de desenvolvimento/teste, migrations e gates sem criar tabela de domínio, usar credencial real ou executar comando destrutivo fora do banco local permitido.

## Fase 3 — Identidade, organizações e isolamento base

**Objetivo:** autenticar usuários e estabelecer contexto de organização seguro.

**Funcionalidades/entregáveis:** login/logout/recuperação conforme decisão; Organization, Membership e Invitation; seleção de organização; papéis predefinidos; guards/policies; TenantContext; repositório tenant-aware; auditoria de acessos administrativos.

**Dependências:** Fases 0 a 2; provedor de e-mail/identidade; estratégia CSRF/sessão; decisão RLS.

**Riscos:** sequestro de sessão, enumeração, escalada de papel, convite reutilizado e bypass de tenant.

**Critérios de aceitação:** usuário alterna apenas entre organizações das quais participa; convite expira e é uso único; último admin é protegido; operações cross-tenant são negadas sem vazamento.

**Testes necessários:** unitários de sessão/policy; integração de memberships e tokens; e2e de login, convite, revogação e troca; matriz A/B; rate limit e CSRF conforme arquitetura.

**Condição de conclusão:** threat cases TM-01 a TM-04 relevantes passam e auditoria permite reconstruir mudanças de acesso.

## Fase 4 — Empresas e escopo do cliente convidado

**Objetivo:** gerenciar empresas e limitar convidados ao conjunto explicitamente autorizado.

**Funcionalidades/entregáveis:** CRUD/arquivamento de Company; responsáveis; CompanyAccess; listagem/filtros; páginas de empresa; policies por empresa.

**Dependências:** Fase 3; definição dos campos mínimos e tratamento de documento fiscal.

**Riscos:** vazamento em listagens/autocomplete, PII desnecessária, convidado com acesso agregado e exclusão de histórico.

**Critérios de aceitação:** identificador é único no tenant; empresa arquivada preserva dados e impede novos processos; convidado só lista/acessa allowlist; admin/gestor seguem matriz.

**Testes necessários:** unitários de policy; integração de constraints/soft archive; e2e por papel; A/B em CRUD, busca, contagem e paginação; acessibilidade de formulário/tabela.

**Condição de conclusão:** duas organizações e dois convidados podem operar sem qualquer dado cruzado em todos os endpoints e telas da fase.

## Fase 5 — Modelos versionados de fechamento

**Objetivo:** permitir definir um processo reutilizável, ordenado e publicável.

**Funcionalidades/entregáveis:** modelo em rascunho; etapas/tarefas; ordenação; prioridade; prazos relativos; evidência obrigatória; responsável sugerido; publicação/versionamento; duplicação e arquivamento.

**Dependências:** Fase 4; regras de data-base, modelo/version e responsabilidades.

**Riscos:** editor complexo, versão mutável, cálculo de prazo ambíguo e modelo inválido publicado.

**Critérios de aceitação:** somente modelo válido é ativado; versão publicada é imutável; edição cria nova versão; ordenação é determinística; arquivamento não destrói referência.

**Testes necessários:** unitários de validação/prazo; integração de versão e concorrência; e2e criar-publicar-duplicar; A/B; teclado e reordenação acessível.

**Condição de conclusão:** modelo real de cliente-piloto é representável sem exceção manual e pode ser publicado/reutilizado com histórico.

## Fase 6 — Instanciação e execução do fechamento

**Objetivo:** gerar uma competência a partir de snapshot e executar tarefas com segurança.

**Funcionalidades/entregáveis:** criação idempotente; snapshot; atribuição; estados de fechamento/tarefa; prazos; fila do analista; comentários em texto; progresso; bloqueios e histórico operacional.

**Dependências:** Fase 5; definição da chave de unicidade e fórmula de progresso.

**Riscos:** duplicação concorrente, desvio entre snapshot e modelo, transição inválida, progresso enganoso e tarefas atribuídas sem acesso.

**Critérios de aceitação:** mesma requisição não duplica fechamento; modelo alterado não muda instância; apenas transições válidas ocorrem; fila respeita tenant/empresa; progresso é explicável.

**Testes necessários:** unitários de transição/progresso; integração de snapshot, unique constraint, idempotência e concorrência; e2e planejar/executar; A/B em listas e histórico; performance com volume representativo.

**Condição de conclusão:** uma equipe executa um fechamento completo sem evidências/revisão, e histórico reconstrói estados e atribuições.

## Fase 7 — Evidências, anexos e pendências

**Objetivo:** comprovar tarefas e administrar bloqueios de forma segura.

**Funcionalidades/entregáveis:** fluxo de upload/finalização; metadados e checksum; scan/status; download autorizado; vínculo a tarefa; criação/atribuição/resolução/verificação de pendência; regra de bloqueio.

**Dependências:** Fase 6; storage, scanner, limites, tipos e retenção definidos.

**Riscos:** malware, bucket público, URL vazada, arquivo órfão, custo/DoS, pendência fechada indevidamente.

**Critérios de aceitação:** arquivo não liberado não conta como evidência; tarefa obrigatória bloqueia sem evidência; download reautoriza e expira; pendência impeditiva bloqueia fluxo; órfãos têm limpeza segura.

**Testes necessários:** unitários de estados; integração de adapter/metadata/cleanup; e2e upload-download-pendência; MIME/tamanho/malware simulado; A/B por ID e storage key; falhas parciais.

**Condição de conclusão:** controles TM-05 e TM-15 foram verificados e a jornada de comprovação funciona em ambiente semelhante à produção.

## Fase 8 — Revisão, aprovação e reabertura

**Objetivo:** criar um gate formal de qualidade com ciclos imutáveis.

**Funcionalidades/entregáveis:** submissão; inbox do revisor; aprovação; reprovação motivada; correção/reenvio; segregação conforme decisão; reabertura justificada; decisões e auditoria.

**Dependências:** Fase 7; política de segregação e critérios de prontidão aprovados.

**Riscos:** aprovação de versão antiga, self-approval indevido, corrida entre correção e decisão e adulteração de histórico.

**Critérios de aceitação:** somente versão/estado esperado é decidido; bloqueios impedem aprovação; reprovação exige motivo; reabertura preserva ciclos; ações são auditadas atomicamente.

**Testes necessários:** unitários de policies/transições; integração de concorrência e atomicidade; e2e reprovar-corrigir-aprovar-reabrir; replay e escalada; A/B; auditoria completa.

**Condição de conclusão:** revisor consegue justificar cada decisão e o sistema reconstrói todos os ciclos sem sobrescrita.

## Fase 9 — Dashboard e governança operacional

**Objetivo:** permitir gestão por exceção sobre múltiplas empresas.

**Funcionalidades/entregáveis:** indicadores de progresso; atrasos; pendências; fila de revisão; filtros por competência/empresa/responsável/estado; drill-down; histórico legível; consulta de auditoria para admin.

**Dependências:** Fase 8; métricas e fórmulas validadas com pilotos.

**Riscos:** agregação cross-tenant, números sem explicação, consultas lentas, cardinalidade e exposição excessiva a convidado.

**Critérios de aceitação:** cada número é reproduzível e leva aos itens; filtros ficam na URL; escopo por papel é respeitado; consulta atende baseline de performance definido na Fase 0/antes do piloto.

**Testes necessários:** unitários de agregação; integração SQL com A/B e volume; e2e filtros/drill-down; acessibilidade sem depender de cor; explain plans; auditoria sem dados sensíveis.

**Condição de conclusão:** gestor identifica e navega até atrasos/bloqueios de uma competência com dados consistentes e tempo aceitável.

## Fase 10 — Hardening, observabilidade e piloto controlado

**Objetivo:** preparar operação segura com dados reais e validar adoção.

**Funcionalidades/entregáveis:** logs/métricas/traces; alertas; runbooks; dashboards operacionais; backup/restore; headers/rate limits; análise de dependências/imagens; política LGPD/retenção; suporte; feature flags necessárias; ambiente de staging e release controlado.

**Dependências:** Fases 0–9; infraestrutura e responsáveis operacionais; contratos/suboperadores.

**Riscos:** incidente sem detecção, restauração falha, custo, suporte invasivo, vulnerabilidade e critérios de sucesso vagos.

**Critérios de aceitação:** checklist de segurança aprovado; restore dentro de RPO/RTO definidos; alertas chegam ao owner; exercício cross-tenant e credencial comprometida realizado; piloto e rollback documentados.

**Testes necessários:** suite completa; DAST/pentest proporcional ao risco; carga; restore drill; caos controlado de dependências; acessibilidade manual; smoke pós-deploy; exercício de incidente.

**Condição de conclusão:** riscos altos estão mitigados ou formalmente aceitos, operação tem owner e um grupo limitado pode iniciar piloto com monitoramento.

## Fase 11 — Aprendizado do piloto e decisão de expansão

**Objetivo:** avaliar valor recorrente e priorizar somente necessidades comprovadas.

**Funcionalidades/entregáveis:** instrumentação de métricas de produto com privacidade; entrevistas; análise de suporte; correções; decisão sobre notificações, importações, billing, MFA/SSO, filas e customizações.

**Dependências:** piloto da Fase 10 por ao menos ciclos mensais suficientes para observar recorrência.

**Riscos:** confundir pedidos isolados com estratégia, medir atividade sem resultado e escalar antes de confiabilidade.

**Critérios de aceitação:** métricas têm baseline; feedback segmentado por persona; problemas críticos fechados; próximos investimentos têm hipótese e indicador.

**Testes necessários:** regressão das correções; análise de funil/coorte validada; testes de usabilidade; spikes das opções priorizadas.

**Condição de conclusão:** decisão explícita de iterar, expandir ou reposicionar, com roadmap revisado e ADRs para novas capacidades estruturais.

## Dependências deliberadamente adiadas

- **Redis/BullMQ:** somente com job durável, retentativa/idempotência e operação justificadas.
- **Microsserviços:** fora do horizonte até limites organizacionais e de escala comprovados.
- **Open Finance/ERP:** após aderência do workflow e contratos de integração definidos.
- **Billing:** após modelo comercial e limites por plano.
- **Analytics avançado:** após modelo operacional estável e política de dados.
