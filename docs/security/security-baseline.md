# Baseline de segurança

Esta baseline é requisito mínimo do MVP e deve ser transformada em controles verificáveis. Decisões do provedor de identidade, infraestrutura e retenção ainda precisam de análise específica.

## Identidade e sessão

- A implementação local segue ADR-006: Argon2id (`m=19456 KiB`, `t=2`, `p=1`), token aleatório de 256 bits e somente SHA-256 persistido.
- Senhas aceitam passphrases de 12 a 128 caracteres, sem truncamento ou composição artificial; e-mail é normalizado por trim, NFKC e lowercase.
- Cookies usam `HttpOnly`, `SameSite=Lax`, `Path=/`, sem `Domain`, e `Secure` obrigatório em produção. Expiração do cookie acompanha a sessão persistida.
- Sessões são novas em cada cadastro/login, revogáveis individualmente, renovadas de forma controlada e limitadas a 30 dias absolutos.
- CORS usa allowlist exata com credenciais. Mutações de autenticação validam `Origin`/`Sec-Fetch-Site` e credenciais aceitam somente JSON.
- Rate limiting atual é por processo e IP; múltiplas instâncias exigirão armazenamento distribuído e configuração explícita de proxy confiável.
- Senhas, se mantidas internamente, usam algoritmo resistente e parâmetros atuais (Argon2id preferencial), nunca criptografia reversível.
- Login, recuperação, convite e endpoints sensíveis têm rate limit e respostas que evitam enumeração.
- Tokens aleatórios têm entropia adequada, validade curta, uso único e armazenamento em hash quando recuperáveis por link.
- Sessões são revogáveis, rotacionadas após autenticação/mudança de privilégio e invalidadas conforme risco.
- Para app web, preferir cookie `HttpOnly`, `Secure` e `SameSite` compatível; proteção CSRF é obrigatória quando autenticação baseada em cookie permitir requisições cross-site.
- MFA e SSO são decisões pré-lançamento/pós-MVP conforme perfil de risco; contas administrativas devem ser priorizadas.
- Não registrar senha, token, cookie ou link completo de recuperação/convite.
- O logging HTTP usa allowlist e não persiste headers, IP, User-Agent ou fingerprint; rate limiting por IP permanece apenas na memória do processo nesta fase.

## Autorização e multitenancy

- Negação por padrão; autenticação, associação, papel, escopo de empresa e estado são verificados no backend.
- Organização ativa é resolvida e validada no servidor a cada contexto de sessão/requisição.
- `X-Organization-Id` nunca concede acesso: sessão, organização e membership ativo são combinados no `TenantContextGuard`; referências externas recebem 404 seguro.
- Repositórios tenant-aware e constraints compostas reduzem risco de IDOR e vínculo cruzado.
- Membership removido permanece `INACTIVE`, evitando perda de trilha histórica; owner não pode ser removido nem deixar a organização nesta fase.
- A aplicação valida invariantes antes da escrita e converte violações residuais do banco em Problem Details genérico, sem constraint ou SQL.
- Operações administrativas e exports exigem permissão específica e auditoria.
- Testes negativos entre dois tenants são obrigatórios para toda feature tenant-owned.
- Contas internas de suporte não recebem bypass implícito; impersonation futura exige consentimento/política, tempo limitado e auditoria destacada.

## Proteção de dados

- TLS em trânsito; criptografia gerenciada em repouso para banco, backups e objetos.
- Coletar somente dados necessários; classificar credenciais, PII, documentos e evidências.
- Segredos ficam em secret manager/variáveis protegidas, nunca no código, imagem, logs ou frontend.
- Separar ambientes, credenciais, buckets e bancos; produção não usa dados reais em desenvolvimento.
- Backups criptografados, com retenção definida e teste periódico de restauração.
- Definir política LGPD: base legal, controlador/operador, atendimento a titulares, retenção, suboperadores e incidente antes do go-live.

## Anexos

- Bucket privado, bloqueio de acesso público e autorização antes de cada URL assinada.
- Limites de tamanho e allowlist de tipos; validar assinatura/MIME real, não apenas extensão.
- Nome e storage key gerados/sanitizados; impedir path traversal e content disposition perigoso.
- Checksum, estado de upload e, antes de disponibilização, varredura antimalware quando a infraestrutura oferecer.
- Downloads com expiração curta, `Content-Disposition: attachment` quando apropriado e política de retenção.
- Remover metadados ou gerar preview somente após avaliação; nunca processar arquivo não confiável com privilégios amplos.

## API e aplicação

- DTOs com allowlist e validação; rejeitar propriedades inesperadas quando seguro.
- Parametrização pelo Prisma; raw SQL excepcional, parametrizado e revisado.
- Proteções contra XSS, CSRF, SSRF, injeção, mass assignment e upload malicioso conforme superfície.
- CORS restrito às origens necessárias; headers de segurança, CSP e HSTS no edge/app.
- Limites de corpo, paginação máxima, timeouts e rate limits por classe de endpoint.
- Erros públicos não expõem stack, SQL, path interno ou existência cross-tenant.
- Dependências com lockfile, atualização periódica, análise de vulnerabilidade e origem confiável.

## Banco e infraestrutura

- Usuário da aplicação com menor privilégio; migration role separado; app nunca usa superuser.
- `DATABASE_URL` e `DATABASE_URL_TEST` pertencem a ambientes distintos no desenvolvimento; o banco de integração é descartável e nunca recebe dados reais.
- Erros de conexão e health checks não registram URL, senha, SQL ou stack; apenas ação e resultado operacional seguros.
- Banco não exposto publicamente; redes e firewall com allowlist mínima.
- Migrations revisadas, backups antes de mudanças arriscadas e estratégia expand/contract.
- RLS não está ativo na Fase 4; sua adoção futura exige ADR substituto, usuário de banco sem bypass e testes de contexto/pooling.
- Ambientes têm logs de acesso administrativo e rotação de chaves.
- Imagens de container mínimas, não-root quando viável, fixadas e analisadas.

## Auditoria e logs

- Ações sensíveis seguem `BR-AUD-001` e são append-only para usuários comuns.
- Eventos incluem ator, tenant, ação, recurso, resultado, UTC e correlação.
- Redação estruturada remove credenciais, conteúdo de comentário/evidência e PII desnecessária.
- Acesso à auditoria é restrito e também auditado.
- Retenção, proteção contra alteração e exportação precisam de política antes da produção.

## SDLC e cadeia de suprimentos

- Proteção de branch e revisão obrigatória antes do merge.
- CI executa lint, types, testes, build, validação OpenAPI, scan de segredos e dependências.
- Actions fixadas por versão/commit confiável e permissões do `GITHUB_TOKEN` mínimas.
- Nenhum segredo disponível a workflows de origem não confiável.
- Mudanças de auth, autorização, multitenancy, upload e auditoria recebem revisão de segurança explícita.

## Resposta a incidentes

Antes do piloto com dados reais, definir responsáveis, canal, severidades, contenção, preservação de evidência, comunicação, rotação de segredo e processo de notificação aplicável. Executar ao menos um exercício de vazamento cross-tenant e um de credencial comprometida.

## Checklist pré-produção

- Threat model revisado e riscos altos tratados ou aceitos formalmente.
- Testes de isolamento, autorização e upload aprovados.
- TLS, cookies, CORS, CSP, rate limit e secret management verificados no ambiente.
- Backup e restauração testados.
- Retenção/LGPD e suboperadores definidos.
- Monitoramento e alertas de segurança ativos.
- Dependências e imagem sem vulnerabilidade crítica conhecida não aceita.
- Plano de incidente e contatos disponíveis.

Antes de produção também são obrigatórias revisão dos parâmetros Argon2id na infraestrutura real, validação de TLS/`Secure`, política de limpeza das sessões expiradas e decisão sobre MFA/recuperação de conta.
