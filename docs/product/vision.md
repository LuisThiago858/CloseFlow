# Visão do produto

## Resumo

CloseFlow é a camada de controle operacional do fechamento financeiro mensal. Ele oferece um espaço único para definir o processo, distribuir responsabilidades, acompanhar prazos, registrar evidências, revisar resultados e demonstrar quem fez o quê e quando.

## Problema

Pequenas equipes financeiras e prestadores de BPO frequentemente coordenam fechamentos por planilhas, mensagens e pastas dispersas. Isso torna difícil responder com segurança:

- O que falta para fechar a competência?
- Quem é responsável e qual é o prazo?
- Qual evidência comprova a execução?
- O que foi reprovado, por quê e como foi corrigido?
- Quais mudanças ocorreram e quem as realizou?
- Quais clientes ou empresas estão em risco de atraso?

O resultado é retrabalho, baixa previsibilidade, dependência de conhecimento tácito e dificuldade de prestação de contas.

## Proposta de valor

O CloseFlow transforma o fechamento em um processo repetível, visível e auditável. Modelos reutilizáveis reduzem trabalho de preparação; responsabilidades e prazos tornam a execução explícita; revisão e evidências aumentam a confiança; dashboards e histórico permitem gestão por exceção.

## Princípios do produto

1. **Processo explícito:** cada fechamento nasce de um modelo ou de uma estrutura deliberada.
2. **Responsabilidade clara:** tarefas têm responsáveis, prazos, prioridade e estado compreensível.
3. **Evidência vinculada:** a comprovação pertence ao contexto da tarefa ou decisão relevante.
4. **Revisão rastreável:** aprovação e reprovação registram ator, instante e justificativa quando exigida.
5. **Isolamento por padrão:** nenhum dado de uma organização pode ser observado ou alterado por outra.
6. **Simplicidade operacional:** o produto não replica funcionalidades de ERP ou contabilidade.
7. **Histórico confiável:** ações sensíveis geram trilha de auditoria imutável para usuários comuns.
8. **Evolução orientada a necessidade:** filas, integrações e novas abstrações entram apenas com caso de uso real.

## Objetivos do MVP

- Permitir que uma organização configure empresas, membros e modelos.
- Instanciar e executar fechamentos mensais de forma consistente.
- Dar visibilidade do progresso, atrasos, bloqueios e carga de responsabilidade.
- Sustentar revisão formal com evidências e pendências.
- Registrar histórico operacional e auditoria de ações sensíveis.
- Validar adoção recorrente por equipes pequenas e BPOs com múltiplos clientes.

## Não objetivos iniciais

- Escrituração contábil, emissão fiscal, conciliação bancária automática ou contas a pagar/receber.
- Substituição do ERP, sistema contábil, GED corporativo ou Open Finance.
- Cálculo de tributos, geração de demonstrações ou assinatura digital qualificada.
- Marketplace, automação complexa de workflow ou construtor genérico de processos.
- Microsserviços, sincronização offline e customização ilimitada por cliente.

## Indicadores de sucesso a validar

- Percentual de fechamentos concluídos dentro do prazo.
- Tempo mediano entre início, envio para revisão e aprovação.
- Percentual de tarefas com evidência quando obrigatória.
- Quantidade e tempo de resolução de pendências.
- Adoção semanal por organização e recorrência mensal por empresa.
- Redução percebida de planilhas, mensagens e cobranças paralelas.

Metas numéricas serão definidas após entrevistas e uma linha de base com clientes-piloto.

## Premissas e questões em aberto

As premissas compartilhadas estão no README. Permanecem abertas: modelo de cobrança, limites por plano, retenção, MFA, provedor de autenticação, notificações, armazenamento definitivo, requisitos regulatórios e SLAs.
