# Visão de arquitetura

## Direção

O CloseFlow será um monólito modular em um monorepo. Frontend, API e pacotes compartilhados têm ciclos coordenados, mas fronteiras explícitas. O sistema começa com um único deploy de backend e um banco PostgreSQL; a modularidade serve ao domínio, não antecipa distribuição.

## Contexto

```text
Usuário no navegador
       |
       | HTTPS / JSON
       v
Frontend React -----> API REST NestJS -----> PostgreSQL
                            |                    (dados e metadados)
                            +---------------> Object Storage privado
                            |                    (anexos)
                            +---------------> E-mail/provedor de identidade
                                                 (a definir)
```

Redis/BullMQ não fazem parte do caminho crítico inicial. Serão adicionados apenas para trabalho assíncrono durável, retentativas ou carga que não seja atendida com segurança por mecanismos mais simples.

## Estrutura futura proposta

```text
apps/
  api/             # NestJS e composição dos módulos
  web/             # React/Vite
packages/
  api-client/      # cliente/tipos gerados a partir do OpenAPI
  config/          # presets compartilhados de tooling
  ui/              # componentes compartilháveis quando houver uso real
docs/
  product/
  architecture/
  security/
  quality/
  roadmap/
  decisions/
```

Não criar pacotes `shared`, `common` ou `utils` genéricos. Código só sobe para `packages` após reuso concreto e uma fronteira estável.

## Módulos de negócio candidatos

- **Identity:** credenciais, sessões, recuperação e identidade do usuário.
- **Organizations:** organização, associações, papéis, convites e contexto ativo.
- **Companies:** empresas gerenciadas e escopos de acesso.
- **ClosingTemplates:** modelos, versões, etapas e tarefas de modelo.
- **Closings:** competência, instâncias, etapas, tarefas, transições e progresso.
- **Collaboration:** comentários e menções futuras.
- **Evidence:** metadados, upload, download e vínculo de anexos.
- **Issues:** pendências e seu ciclo de vida.
- **Reviews:** submissões, aprovações, reprovações e reaberturas.
- **Dashboard:** projeções e consultas agregadas.
- **Audit:** captura e consulta protegida de eventos.

Módulos podem iniciar como pastas no mesmo app. Eles não representam serviços independentes.

## Fluxo de uma requisição

1. Middleware/guard valida identidade e sessão.
2. Contexto resolve a organização ativa a partir de rota/cabeçalho controlado e associação no servidor.
3. Guard/policy verifica papel e escopo de empresa quando aplicável.
4. Controller valida o contrato e chama um caso de uso.
5. Aplicação coordena domínio, transação e portas de infraestrutura.
6. Repositórios aplicam filtros de tenant obrigatórios.
7. A operação e a auditoria sensível são persistidas de modo atomicamente consistente quando necessário.
8. Presenter mapeia o resultado para DTO sem expor modelo de persistência.

## Princípios de dependência

- Controllers dependem de casos de uso, nunca de Prisma.
- Domínio não depende de NestJS, HTTP ou Prisma quando houver regra rica que justifique isolamento.
- Infraestrutura implementa contratos definidos pelo módulo consumidor.
- Módulos não consultam tabelas internos de outros módulos de forma ad hoc; usam interface pública ou projeção de leitura deliberada.
- Transações que cruzam módulos permanecem locais ao monólito e têm dono explícito no caso de uso.
- Contratos públicos são versionados e documentados.

## Decisões de consistência

- Operações transacionais críticas usam consistência forte no PostgreSQL.
- Auditoria de uma ação sensível deve ser gravada na mesma transação sempre que sua ausência comprometer a prova.
- Dashboard pode usar consultas otimizadas e consistência eventual apenas quando a defasagem estiver indicada e houver necessidade real.
- Idempotência será aplicada a criação de fechamento, aceite de convite, upload finalizado e demais comandos suscetíveis a repetição.

## Evolução e limites

O primeiro limite de escala é melhorar índices, consultas, paginação e jobs dentro do monólito. Extração de serviço só pode ocorrer após evidência de necessidade operacional, ownership independente e contrato estável, registrada em ADR.
