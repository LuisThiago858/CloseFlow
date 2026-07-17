# Estratégia de testes

## Objetivos

Os testes devem dar confiança em regras de fechamento, isolamento entre organizações, autorização, contratos e jornadas críticas. A pirâmide é orientadora: maximizar testes rápidos sem substituir integração real onde banco, HTTP e storage são parte do risco.

## Níveis

### Unitários

- Entidades/value objects, transições, cálculo de progresso, prazos, policies e validações puras.
- Componentes com lógica e hooks puros.
- Sem mocks indiscriminados; testar resultado observável e invariantes.

### Integração

- Repositórios Prisma contra PostgreSQL real descartável.
- Fundação de persistência verifica conexão, consulta simples, migrations aplicadas, ausência de tabelas de domínio e health disponível/indisponível.
- Constraints, transações, concorrência, migrações e isolamento A/B.
- Módulos NestJS com adapters controlados.
- Frontend com Testing Library + MSW para formulários, erros e cache.
- Integração de storage por fake fiel ou ambiente compatível, além de contrato do adapter.

### Contrato

- OpenAPI válido e sem breaking change acidental.
- Respostas e Problem Details aderem ao schema.
- Cliente gerado compila com frontend.
- Adapters externos têm contract tests conforme fornecedor escolhido.

### End-to-end

- Navegador e API em stack próxima da real.
- Fluxo crítico: autenticar, selecionar organização, configurar empresa/template, criar fechamento, executar com evidência, revisar, reprovar/corrigir e aprovar.
- Acesso cross-tenant, cliente convidado, sessão expirada e troca de organização.
- Poucos testes, estáveis, com dados isolados e diagnóstico útil.

### Não funcionais

- Acessibilidade automatizada e teclado nos fluxos críticos; auditoria manual periódica.
- Segurança: SAST, dependências, segredos, autorização e testes derivados do threat model.
- Performance: baseline de listas/dashboard e criação de snapshot com volume representativo antes do piloto.
- Resiliência: falha de storage/e-mail, retry seguro quando existir job, backup/restore.

## Matriz mínima por risco

| Área         | Unitário              | Integração                          | E2E                       | Segurança                     |
| ------------ | --------------------- | ----------------------------------- | ------------------------- | ----------------------------- |
| Auth/sessão  | Regras de expiração   | Sessão/revogação                    | Login/logout/reset        | brute force, CSRF, enumeração |
| Multitenancy | Policies              | Repositórios e agregações A/B       | troca de organização      | IDOR e cache leakage          |
| Fechamento   | Transições/progresso  | constraint, snapshot e concorrência | jornada completa          | ação fora do papel/estado     |
| Evidências   | regras de estado/tipo | metadata/storage adapter            | upload/download           | arquivo malicioso e URL       |
| Revisão      | segregação/transições | atomicidade/auditoria               | reprovar/corrigir/aprovar | replay/escalada               |
| Dashboard    | cálculo/filtros       | queries com volume e tenant         | drill-down                | agregação cruzada             |

## Dados e ambiente

- Factories tipadas criam organizações A e B e usuários por papel.
- Cada teste controla relógio e identificadores quando necessário.
- Integração usa PostgreSQL da mesma versão de produção, provisionado de forma descartável.
- Localmente, `postgres-test` usa porta e armazenamento separados; `DATABASE_URL_TEST` é obrigatória e nunca pode apontar para produção.
- No CI, o PostgreSQL pertence exclusivamente ao job e migrations são aplicadas com `migrate deploy`, nunca com `migrate dev`.
- Migrações são aplicadas do zero em CI e, quando houver baseline, testadas sobre versão anterior.
- Testes nunca dependem de ordem, internet pública ou dados pessoais reais.
- E2E usa seletores por papel/nome acessível; `data-testid` somente quando não houver seletor semântico estável.

## Cobertura e gates

- Cobertura é sinal, não objetivo isolado. Baseline inicial sugerida: 80% de linhas/branches nos módulos de domínio/aplicação críticos, ajustada com evidência.
- `main` exige lint, formatação, typecheck, testes unitários/integração, build, OpenAPI e scans.
- E2E crítico roda em pull requests quando duração for aceitável e obrigatoriamente antes de release.
- Flaky test é defeito: corrigir ou isolar com owner e prazo; não repetir até passar como estratégia.
- Nenhum merge com teste obrigatório vermelho ou risco crítico não aceito.

## Responsabilidades

- Autor define testes junto da mudança.
- Revisor verifica casos negativos, tenant, autorização, acessibilidade e documentação.
- Dono da área mantém fixtures e contratos.
- Falha em produção gera teste de regressão quando tecnicamente aplicável.

## Evidência de teste

Pull request informa comandos executados, resultado e limitações. Não declarar validação não executada. Evidência sensível nunca é anexada a logs públicos.
