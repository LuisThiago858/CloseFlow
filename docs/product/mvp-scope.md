# Escopo do MVP

## Resultado esperado

Uma organização consegue cadastrar equipe e empresas, criar um modelo, gerar o fechamento de uma competência, executar e revisar tarefas com evidências e acompanhar o resultado de forma auditável.

## Incluído

### Identidade e organização

- Login, logout, recuperação de acesso e expiração segura de sessão.
- Criação/onboarding de organização conforme fluxo comercial definido.
- Convites de uso único com validade, aceite e revogação.
- Papéis predefinidos e vínculos de usuário com organização.

### Empresas gerenciadas

- Cadastro, edição, ativação e arquivamento.
- Nome, identificador interno, documento fiscal opcional conforme política, fuso horário e responsáveis principais.
- Controle explícito de acesso do cliente convidado por empresa.

### Modelos de fechamento

- Criação, edição, duplicação, ativação e arquivamento de modelos.
- Etapas ordenadas e tarefas com título, descrição, prioridade, prazo relativo, responsável sugerido e exigência de evidência.
- Versionamento por snapshot: alterações futuras no modelo não mudam fechamentos já criados.

### Fechamentos mensais

- Uma instância por empresa, competência e tipo/modelo ativo, protegida contra duplicação.
- Snapshot do modelo, datas planejadas, responsáveis e estados.
- Execução de tarefas; comentários; evidências; pendências; submissão para revisão; aprovação e reprovação.
- Reabertura somente por papel autorizado e sempre auditada.

### Acompanhamento e governança

- Dashboard por organização com filtros de competência, empresa, responsável e estado.
- Progresso calculado, itens atrasados, pendências abertas e revisões aguardando ação.
- Histórico legível do recurso e log de auditoria para ações sensíveis.

### Qualidade operacional

- API REST documentada em OpenAPI.
- Validação consistente, erros padronizados, acessibilidade essencial e observabilidade baseline.
- Testes unitários, integração e e2e conforme risco.

## Fora do MVP

- ERP, contabilidade, emissão fiscal, folha, tesouraria ou conciliação automática.
- Conectores bancários, Open Finance, importação automática de ERP e webhooks públicos.
- Aplicativos móveis nativos e suporte offline.
- Workflow genérico com regras condicionais, scripts ou aprovações multinível arbitrárias.
- Notificações por WhatsApp/SMS e central omnichannel.
- Cobrança automática e gestão de assinaturas, até definição comercial.
- Assinatura digital, carimbo de tempo certificado ou valor probatório regulatório específico.
- BI avançado, data warehouse e benchmarking entre organizações.
- Microsserviços, filas ou cache distribuído sem necessidade mensurável.

## Restrições e guardrails

- TypeScript estrito e sem `any`.
- Controllers sem regra de negócio e sem acesso direto ao Prisma.
- Organização não é confiada a partir de identificadores enviados pelo frontend.
- Toda consulta tenant-owned exige contexto de organização validado.
- Anexos são privados, validados e acessados de modo temporário.
- Alterações de escopo devem atualizar visão, regras, roadmap e ADR quando houver decisão estrutural.

## Critério de sucesso do MVP

O MVP está validado tecnicamente quando o fluxo crítico completo funciona com isolamento entre duas organizações, da configuração à aprovação, com histórico e auditoria; e validado como produto somente após uso recorrente por clientes-piloto em fechamentos reais.
