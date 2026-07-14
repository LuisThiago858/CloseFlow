# Personas e perfis de acesso

Personas descrevem necessidades; papéis definem permissões. Uma pessoa pode exercer mais de uma persona em organizações diferentes, mas cada acesso depende de associação explícita.

## Administrador da organização

**Contexto:** sócio, coordenador do BPO ou responsável pela conta.

**Objetivos:** configurar a organização, convidar pessoas, atribuir papéis, cadastrar empresas e garantir governança.

**Dores:** acesso excessivo, onboarding inconsistente, dificuldade de saber quem pode ver cada cliente e ausência de trilha administrativa.

**Necessidades no MVP:** gestão de membros e empresas; modelos; visão agregada; consulta de auditoria; desativação de acessos.

## Gestor financeiro

**Contexto:** coordena vários fechamentos, empresas ou analistas.

**Objetivos:** planejar competências, distribuir trabalho, antecipar atrasos e assegurar a conclusão.

**Dores:** status coletado manualmente, dependências invisíveis, prazos dispersos e baixa comparabilidade entre clientes.

**Necessidades no MVP:** criação de fechamentos; atribuição; dashboard; prioridades; pendências; envio e acompanhamento de revisão.

## Analista financeiro

**Contexto:** executa etapas e reúne evidências.

**Objetivos:** saber o que fazer, em que ordem, até quando e o que comprova a conclusão.

**Dores:** requisitos ambíguos, troca constante de contexto, cobrança por múltiplos canais e retrabalho após revisão.

**Necessidades no MVP:** fila de tarefas; detalhes e instruções; atualização de status; comentários; anexos; resposta a pendências.

## Revisor

**Contexto:** líder técnico, controller, consultor sênior ou responsável do cliente.

**Objetivos:** confirmar qualidade e completude antes do fechamento final.

**Dores:** evidências espalhadas, ausência de critérios, correções sem rastreabilidade e aprovações informais.

**Necessidades no MVP:** visão do que aguarda revisão; evidências; aprovação/reprovação motivada; pendências; histórico.

## Cliente convidado

**Contexto:** representante da empresa atendida pelo BPO ou consultor.

**Objetivos:** acompanhar andamento, responder solicitações e fornecer documentos sem acessar outros clientes.

**Dores:** falta de visibilidade, pedidos repetidos, canais dispersos e exposição indevida de informação operacional.

**Necessidades no MVP:** acesso restrito às empresas autorizadas; tarefas e pendências explicitamente compartilhadas; comentários e anexos permitidos; leitura de progresso compatível com seu escopo.

## Matriz inicial de capacidades

| Capacidade                       | Admin             | Gestor             | Analista                | Revisor             | Cliente convidado           |
| -------------------------------- | ----------------- | ------------------ | ----------------------- | ------------------- | --------------------------- |
| Configurar organização e membros | Sim               | Não                | Não                     | Não                 | Não                         |
| Gerenciar empresas               | Sim               | Sim                | Não                     | Não                 | Não                         |
| Gerenciar modelos                | Sim               | Sim                | Colaborar, se permitido | Ler                 | Não                         |
| Criar e coordenar fechamentos    | Sim               | Sim                | Não                     | Não                 | Não                         |
| Executar tarefas atribuídas      | Sim               | Sim                | Sim                     | Conforme atribuição | Somente compartilhadas      |
| Aprovar ou reprovar              | Se também revisor | Se permitido       | Não                     | Sim                 | Se explicitamente designado |
| Consultar dashboard agregado     | Sim               | Sim                | Escopo próprio          | Escopo de revisão   | Empresas autorizadas        |
| Consultar auditoria              | Sim               | Conforme permissão | Não                     | Não                 | Não                         |

A matriz é uma baseline. A autorização efetiva deve considerar organização ativa, vínculo, papel, empresa permitida, estado do recurso e propriedade/atribuição. Não haverá permissões escolhidas livremente por usuário no primeiro MVP.
