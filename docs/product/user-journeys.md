# Jornadas do usuário

## 1. Configurar organização e equipe

1. O administrador entra em uma organização válida.
2. Configura nome, fuso horário e preferências operacionais.
3. Convida membros informando e-mail e papel.
4. O convidado aceita um convite válido e passa a integrar a organização.
5. O administrador pode alterar papel ou revogar acesso.

**Exceções:** convite expirado, e-mail divergente, membro já ativo, último administrador e tentativa de escalada de privilégio.

**Evidência de sucesso:** vínculo ativo, evento de auditoria e acesso limitado ao novo papel.

## 2. Cadastrar empresa e acesso de cliente

1. Admin ou gestor cadastra a empresa gerenciada.
2. Define fuso, identificador interno e responsáveis.
3. Seleciona quais clientes convidados podem acessar a empresa.
4. O convidado visualiza apenas empresas e itens explicitamente autorizados.

**Exceções:** identificador duplicado na organização, empresa arquivada e convidado sem vínculo.

## 3. Criar modelo reutilizável

1. Gestor cria um modelo em rascunho.
2. Adiciona etapas ordenadas e tarefas.
3. Para cada tarefa, define instruções, prioridade, prazo relativo, papel/responsável sugerido e evidência obrigatória.
4. Revisa e ativa o modelo.
5. Novos fechamentos usam a versão vigente; instâncias existentes preservam o snapshot.

**Exceções:** ativação sem etapas/tarefas válidas, prazos inválidos e arquivamento de modelo em uso.

## 4. Planejar o fechamento mensal

1. Gestor escolhe empresa, competência e modelo.
2. O sistema valida unicidade e acesso.
3. Cria etapas e tarefas a partir do snapshot.
4. Resolve responsáveis sugeridos e sinaliza lacunas.
5. Gestor revisa datas e inicia o fechamento.

**Exceções:** fechamento duplicado, empresa inativa, modelo inválido ou responsável sem acesso à empresa.

## 5. Executar tarefa com evidência

1. Analista abre sua fila e seleciona uma tarefa.
2. Consulta instruções, prazo, comentários e dependências informativas.
3. Marca início, adiciona comentário e envia evidência quando necessário.
4. Conclui a tarefa.
5. O sistema bloqueia conclusão se faltar evidência obrigatória ou pendência impeditiva.

**Exceções:** tarefa bloqueada, anexo inválido, atribuição revogada e fechamento já aprovado.

## 6. Registrar e resolver pendência

1. Usuário autorizado registra pendência ligada ao fechamento ou tarefa.
2. Define descrição, severidade, responsável e prazo.
3. O responsável comenta, anexa comprovação e marca como resolvida.
4. O autor ou gestor confirma a resolução, quando a política exigir.

Pendência impeditiva aberta bloqueia submissão ou aprovação conforme regra configurada no produto.

## 7. Revisar, reprovar e corrigir

1. Com tarefas obrigatórias concluídas, gestor envia o fechamento para revisão.
2. Revisor consulta resumo, tarefas, evidências e pendências.
3. Se houver problema, reprova com justificativa e, preferencialmente, referencia tarefas ou abre pendência.
4. A equipe corrige e reenvia.
5. Cada ciclo permanece no histórico.

## 8. Aprovar e encerrar

1. Revisor confirma critérios de conclusão e ausência de bloqueios.
2. Aprova o fechamento.
3. O sistema registra ator, instante e versão revisada, tornando a instância somente leitura para operações comuns.
4. Reabertura exige permissão elevada e justificativa, sem apagar a aprovação anterior.

## 9. Acompanhar portfólio

1. Gestor seleciona uma competência no dashboard.
2. Visualiza progresso por empresa, atrasos, pendências e revisões.
3. Filtra por responsável, estado e prioridade.
4. Navega do indicador ao item que explica o valor.

Os indicadores devem ser derivados do estado operacional, indicar horário de atualização e não expor empresas fora do escopo do usuário.

## 10. Investigar alteração

1. Administrador acessa auditoria com filtros por período, ator, ação e recurso.
2. Consulta metadados seguros, correlação e resultado.
3. O sistema não revela segredos, conteúdo integral de arquivos ou dados sensíveis desnecessários.
4. Exportação não integra o MVP até haver política de retenção e autorização definida.
