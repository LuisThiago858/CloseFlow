# Modelo de ameaças

## Escopo e método

Modelo inicial baseado em STRIDE para navegador, API, PostgreSQL, armazenamento de objetos, autenticação/e-mail, CI/CD e operadores. Deve ser revisado a cada mudança de fronteira, integração ou dado sensível.

## Ativos críticos

- Credenciais, sessões, convites e recuperação de conta.
- Associações, papéis e escopos de empresa.
- Dados financeiros operacionais, comentários, evidências e anexos.
- Aprovações, pendências, histórico e log de auditoria.
- Segredos, backups, artefatos e pipeline de entrega.
- Confiança de que dados e indicadores pertencem ao tenant correto.

## Fronteiras de confiança

1. Navegador não confiável para edge/API.
2. API para banco e object storage.
3. API para provedor de identidade/e-mail.
4. CI/CD para registry e produção.
5. Operadores/suporte para consoles administrativos.
6. Arquivos enviados para pipeline de processamento.

## Ameaças prioritárias

| ID    | Ameaça                                                        | Impacto    | Mitigações principais                                                                       | Risco residual/validação            |
| ----- | ------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------- | ----------------------------------- |
| TM-01 | IDOR ou filtro ausente expõe outro tenant                     | Crítico    | TenantContext validado, filtros compostos, policies, constraints, testes A/B e possível RLS | Alto até testes e spike de RLS      |
| TM-02 | Escalada de papel/empresa por mass assignment                 | Crítico    | DTO allowlist, casos de uso específicos, negação padrão, auditoria e testes negativos       | Médio                               |
| TM-03 | Roubo/fixação de sessão                                       | Alto       | Cookies seguros, rotação, expiração, revogação, TLS e proteção XSS/CSRF                     | Médio; MFA pendente                 |
| TM-04 | Enumeração ou abuso de login/convite/reset                    | Alto       | Respostas uniformes, rate limit, tokens hash/uso único e monitoramento                      | Médio                               |
| TM-05 | Upload malicioso ou acesso público a anexo                    | Alto       | Bucket privado, validação real, limites, scan, URL curta e download autorizado              | Alto até definir scanner/storage    |
| TM-06 | XSS em comentário/nome de arquivo                             | Alto       | Texto escapado, sem HTML arbitrário, CSP e headers                                          | Baixo/médio                         |
| TM-07 | CSRF em ação sensível                                         | Alto       | SameSite, token/origin check conforme arquitetura e não usar GET mutável                    | Baixo após teste                    |
| TM-08 | Injeção SQL/command/SSRF                                      | Alto       | Prisma parametrizado, validação, allowlists, sem shell/URL arbitrária                       | Baixo/médio                         |
| TM-09 | Aprovação ou auditoria adulterada                             | Alto       | Eventos append-only, transação, autorização, relógio confiável, backup e acesso restrito    | Médio; retenção pendente            |
| TM-10 | Condição de corrida duplica fechamento ou sobrescreve revisão | Médio/alto | Unique constraint, idempotência, estado/versionamento otimista e transações                 | Baixo após integração               |
| TM-11 | Vazamento por cache, dashboard, busca ou logs                 | Crítico    | Namespace tenant, query keys, filtros, redaction e testes de agregação                      | Médio                               |
| TM-12 | Comprometimento de dependência/CI                             | Alto       | Lockfile, scans, Actions fixadas, permissões mínimas e revisão                              | Médio                               |
| TM-13 | Operador interno acessa dados indevidamente                   | Alto       | Least privilege, acesso just-in-time futuro, logs administrativos e sem bypass implícito    | Médio/alto; processo pendente       |
| TM-14 | Perda/ransomware e backup inválido                            | Alto       | Backups isolados/criptografados, retenção e restauração testada                             | Médio                               |
| TM-15 | DoS por consultas, anexos ou login                            | Médio/alto | Limites, paginação, rate limit, timeout, quotas e monitoramento                             | Médio; limites comerciais pendentes |
| TM-16 | E-mail de convite enviado à pessoa errada                     | Alto       | Exibir destino, expiração, revogação, aceite pelo e-mail esperado e auditoria               | Médio                               |
| TM-17 | URL ou credencial do banco vaza em erro, health ou log        | Alto       | Configuração validada, mensagens genéricas, logging allowlist e testes de não vazamento     | Baixo após testes automatizados     |

## Cenários de abuso essenciais

### Atacante troca identificadores

Membro de A substitui `closingId`, `companyId`, `organizationId` ou storage key por valor de B. A API deve negar sem revelar a existência; banco e repositório não podem retornar o registro; evento anômalo pode ser registrado sem conteúdo sensível.

### Cliente convidado amplia o escopo

Convidado tenta listar dashboard agregado, consultar empresa não allowlisted, atribuir tarefa ou acessar auditoria. Cada rota e consulta agregada deve aplicar organização, papel e company scope.

### Aprovação indevida

Analista chama endpoint de aprovação ou repete uma aprovação antiga após reabertura. Policy e versão/estado esperado impedem a ação; toda tentativa relevante possui correlação.

### Anexo poliglota ou storage key vazada

Arquivo tem extensão permitida e conteúdo ativo; ou URL é compartilhada. Validação MIME, scan, headers de download, expiração curta e autorização prévia reduzem exposição.

### Cache após troca de organização

Usuário alterna de A para B e vê resposta de A por query key genérica. Keys tenant-aware, cancelamento, limpeza e teste e2e são obrigatórios.

## Requisitos de teste derivados

- Matriz de autorização por endpoint e estado, incluindo acessos negativos.
- Suite de isolamento A/B para CRUD, agregações, busca, anexos e jobs.
- Testes de concorrência para criação e transições.
- Testes de token expirado/reutilizado, revogação e rate limiting.
- Arquivos com extensão/MIME divergente, tamanho excedido e estado não liberado.
- Verificação de headers, CORS, CSRF, XSS e redaction de logs.
- Indisponibilidade do PostgreSQL retorna `503` sem URL, credencial, SQL ou stack; liveness permanece independente.
- Restore drill e exercício de incidente antes de dados reais.

## Riscos abertos que exigem decisão

- Provedor e arquitetura de autenticação, MFA e recuperação.
- RLS com Prisma e pooling.
- Armazenamento, antimalware, preview, limites e retenção de anexos.
- Requisitos LGPD e papéis contratuais por cliente.
- Modelo de suporte, acesso operacional e impersonation.
- Infraestrutura, região, backup, RPO/RTO e proteção DDoS.
- Força probatória esperada de auditoria e aprovações.

O owner de segurança deve atribuir responsável, prazo e decisão de aceitar/mitigar para cada risco antes do go-live.
