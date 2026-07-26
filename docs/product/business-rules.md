# Regras de negócio

As regras usam identificadores estáveis para facilitar rastreamento em histórias, testes e decisões.

## Identidade e sessão

- **BR-ID-001:** e-mail é normalizado de forma determinística e único globalmente; usuário não recebe papel global de negócio.
- **BR-ID-002:** senha existe somente durante a requisição e como hash Argon2id persistido; nunca é retornada ou registrada.
- **BR-ID-003:** cada cadastro/login cria token opaco novo, armazena somente seu hash e não reutiliza sessão apresentada.
- **BR-ID-004:** sessão expirada, revogada ou de usuário desabilitado não autentica; logout atual é imediato e idempotente.
- **BR-ID-005:** respostas de login não diferenciam e-mail inexistente, senha incorreta ou usuário desabilitado.
- **BR-ID-006:** usuário só lista e revoga sessões próprias; tentativa com identificador alheio não revela existência.

## Organização e acesso

- **BR-ORG-001:** todo recurso de negócio pertence a exatamente uma organização, direta ou transitivamente.
- **BR-ORG-002:** o acesso exige usuário ativo, associação ativa e autorização compatível na organização ativa.
- **BR-ORG-003:** identificadores de organização recebidos do cliente são apenas referências a validar; nunca definem por si sós o tenant efetivo.
- **BR-ORG-004:** um usuário pode pertencer a várias organizações, mas cada requisição opera em um único contexto de organização.
- **BR-ORG-005:** toda organização nasce `ACTIVE` com ao menos um membership `ACTIVE/OWNER`; não existe alteração pública de status nesta fase.
- **BR-ORG-006:** remover ou deixar uma organização desativa o membership sem apagar seu histórico e invalida apenas o acesso ao tenant, não a sessão global.
- **BR-ORG-007:** membership é único permanentemente por organização e usuário; retorno futuro reativa o mesmo registro em vez de criar outro.
- **BR-ORG-008:** remover `MEMBER` é idempotente: vínculo ativo vira `INACTIVE` e repetição sobre o mesmo vínculo inativo retorna sucesso sem nova escrita.
- **BR-ORG-009:** `OWNER` não pode ser removido, deixar a organização nem ter papel alterado nesta fase; transferência e promoção ficam adiadas.
- **BR-ORG-010:** slug é global, imutável e único; conflitos não recebem sufixo automático.
- **BR-ORG-011:** rotas tenant-scoped exigem `X-Organization-Id`; ausência produz 400, enquanto UUID, parâmetro ou payload inválido produz 422.

## Empresas gerenciadas

- **BR-CMP-001:** identificadores internos de empresa são únicos dentro da organização, não globalmente.
- **BR-CMP-002:** arquivar uma empresa impede novos fechamentos, preservando histórico.
- **BR-CMP-003:** cliente convidado acessa somente empresas explicitamente associadas e itens liberados pelo seu escopo.

## Modelos

- **BR-TPL-001:** modelo ativo precisa conter ao menos uma etapa e uma tarefa válida.
- **BR-TPL-002:** etapas e tarefas mantêm ordem determinística.
- **BR-TPL-003:** criação de fechamento captura snapshot do modelo; edições posteriores não alteram instâncias existentes.
- **BR-TPL-004:** modelo utilizado não é apagado fisicamente; pode ser arquivado.
- **BR-TPL-005:** prazo relativo é calculado a partir de uma data-base definida do fechamento e no fuso da organização/empresa.

## Fechamentos, etapas e tarefas

- **BR-CLS-001:** competência é um mês civil representado por `YYYY-MM` e armazenado de forma validável.
- **BR-CLS-002:** não pode haver duplicata para a chave organizacional definida por empresa, competência e categoria/modelo de fechamento.
- **BR-CLS-003:** estados iniciais propostos são `DRAFT`, `IN_PROGRESS`, `IN_REVIEW`, `CHANGES_REQUESTED`, `APPROVED`, `REOPENED` e `ARCHIVED`.
- **BR-CLS-004:** transições são comandadas por casos de uso autorizados, não por atualização genérica de status.
- **BR-CLS-005:** fechamento só vai a revisão com tarefas obrigatórias concluídas, evidências obrigatórias presentes e nenhuma pendência impeditiva aberta.
- **BR-CLS-006:** aprovação torna o fechamento somente leitura para operações comuns.
- **BR-CLS-007:** reabertura exige papel autorizado e justificativa; cria novo ciclo sem apagar decisões anteriores.
- **BR-TSK-001:** estados iniciais de tarefa são `TODO`, `IN_PROGRESS`, `BLOCKED`, `DONE` e `CANCELED`.
- **BR-TSK-002:** tarefa com evidência obrigatória não pode ser concluída sem ao menos uma evidência válida e disponível.
- **BR-TSK-003:** responsável deve ser membro ativo e possuir acesso à empresa/recurso.
- **BR-TSK-004:** cancelamento exige permissão e justificativa e não equivale à conclusão para o cálculo, salvo regra explícita.
- **BR-TSK-005:** progresso usa fórmula documentada e consistente; baseline: tarefas concluídas elegíveis dividido por tarefas ativas elegíveis.

## Revisão e pendências

- **BR-REV-001:** revisor precisa de permissão e acesso ao fechamento.
- **BR-REV-002:** reprovação exige justificativa não vazia.
- **BR-REV-003:** cada submissão, aprovação e reprovação cria decisão histórica própria.
- **BR-REV-004:** por padrão, quem executa não deve aprovar sozinho o mesmo fechamento quando segregação estiver habilitada; a política final permanece configurável por organização em fase posterior.
- **BR-ISS-001:** pendência tem severidade, estado, responsável opcional, prazo opcional e vínculo com fechamento e, quando aplicável, tarefa.
- **BR-ISS-002:** estados propostos são `OPEN`, `IN_PROGRESS`, `RESOLVED`, `VERIFIED` e `CANCELED`.
- **BR-ISS-003:** pendência impeditiva aberta bloqueia aprovação.

## Comentários e evidências

- **BR-COM-001:** comentários pertencem ao contexto organizacional do recurso e registram autor e instante.
- **BR-COM-002:** edição, se permitida, registra indicador e histórico; exclusão de usuário comum é lógica.
- **BR-EVD-001:** evidência possui metadados, autor, integridade e vínculo; conteúdo binário fica fora do PostgreSQL.
- **BR-EVD-002:** upload usa política de tamanho, tipo permitido, nome seguro e verificação antimalware quando disponível antes de marcar arquivo como utilizável.
- **BR-EVD-003:** download exige autorização a cada solicitação e URL temporária; buckets não são públicos.

## Auditoria, tempo e exclusão

- **BR-AUD-001:** login relevante, gestão de acesso, alterações estruturais, transições, decisões de revisão, evidências e reabertura geram auditoria.
- **BR-AUD-002:** evento registra organização, ator, ação, recurso, instante UTC, resultado e correlação, sem segredos.
- **BR-AUD-003:** usuários comuns não alteram nem removem eventos de auditoria.
- **BR-TIME-001:** instantes persistem em UTC; apresentação respeita o fuso configurado.
- **BR-DEL-001:** recursos com valor histórico são arquivados ou excluídos logicamente; política de eliminação definitiva depende de retenção aprovada.

## Pontos que exigem decisão de produto

- Definição exata da chave de unicidade quando uma empresa tiver múltiplos tipos de fechamento na mesma competência.
- Política obrigatória ou opcional de segregação entre executor e revisor.
- Regras de edição de comentários e substituição de evidências.
- Severidades de pendência e quais bloqueiam submissão ou somente aprovação.
- Pesos no cálculo de progresso e tratamento de tarefas canceladas/opcionais.
- Limites de arquivo, retenção, versionamento, exportação e valor probatório esperado.
