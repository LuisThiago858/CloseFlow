# ADR-006 — Sessões opacas persistidas no PostgreSQL

- **Status:** aceito
- **Data:** 2026-07-17

## Contexto

O frontend web precisa autenticar usuários locais por e-mail e senha, permitir revogação imediata e manter o token inacessível ao JavaScript. A fundação já possui PostgreSQL e Prisma, enquanto Redis, múltiplas instâncias e provedores externos ainda não possuem caso de uso concreto.

## Decisão

- Senhas são armazenadas somente como Argon2id, com parâmetros mínimos validados no startup.
- Cada autenticação gera 32 bytes aleatórios e uma nova sessão, sem reutilizar credencial apresentada pelo navegador.
- O token opaco é enviado somente em cookie `HttpOnly`, `SameSite=Lax`, `Path=/` e `Secure` em produção.
- O PostgreSQL armazena exclusivamente SHA-256 do token. Não há JWT, refresh token ou token em Web Storage.
- Sessões têm expiração deslizante de sete dias, renovação nas últimas 24 horas, atividade escrita no máximo a cada 15 minutos e limite absoluto de 30 dias.
- Logout e revogação persistem imediatamente `revoked_at` e motivo. Sessões expiradas, revogadas ou de usuário desabilitado são recusadas.
- CORS usa allowlist exata com credenciais. Mutações validam `Origin`/Fetch Metadata e credenciais aceitam somente JSON.
- Rate limiting de login e cadastro permanece em memória enquanto existir uma única instância.

## Alternativas consideradas

### JWT com refresh token

Rejeitado nesta fase. Revogação, rotação, detecção de replay e armazenamento do refresh token acrescentariam complexidade sem benefício para um único monólito com PostgreSQL disponível.

### Sessão somente em memória

Rejeitada porque reinícios invalidariam todas as sessões, não haveria prova persistida de revogação e a evolução para mais de um processo exigiria troca imediata da arquitetura.

### Redis

Adiado. Não há carga, latência ou topologia distribuída que justifique nova dependência operacional.

### Provedor externo de identidade

Adiado até existir decisão comercial sobre MFA, SSO e provedores sociais. A fronteira do módulo Identity permite substituição futura sem expor modelos Prisma à API.

## Consequências

- Toda requisição autenticada consulta PostgreSQL; disponibilidade do banco é requisito para rotas protegidas.
- Revogação é simples e observada na requisição seguinte.
- Vazamento isolado do banco não fornece tokens reutilizáveis; o token bruto existe somente no navegador e durante o processamento da requisição.
- Limpeza de sessões expiradas, rate limit distribuído, recuperação de senha, MFA e login externo continuam pendentes.
- Usuário e sessão são recursos globais. Organização, membership, papel e tenant context pertencem à Fase 4 e não são inferidos da sessão atual.
- Logs estruturados de autenticação não substituem o futuro `AuditEvent` append-only.
