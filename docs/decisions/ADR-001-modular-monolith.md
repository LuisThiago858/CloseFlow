# ADR-001: Adotar monólito modular

- **Status:** Aceito
- **Data:** 2026-07-12

## Contexto

O CloseFlow inicia com domínio ainda em descoberta, equipe e carga desconhecidas e forte necessidade de consistência entre fechamento, revisão, evidência e auditoria. A solução precisa de fronteiras claras sem custo operacional de distribuição.

## Decisão

Adotar um único backend implantável, organizado em módulos de negócio com APIs internas explícitas. Aplicar domínio, aplicação, infraestrutura e apresentação quando a separação proteger regras ou integrações; CRUD simples pode ser mais enxuto. PostgreSQL e transações locais são a fonte de consistência.

Módulos não são microsserviços. Acesso aos dados de outro módulo deve ocorrer por interface pública ou projeção deliberada, evitando dependências ad hoc. Controllers não contêm regra nem usam Prisma.

## Alternativas consideradas

- **Microsserviços:** rejeitados pela complexidade de deploy, observabilidade, consistência e contratos antes de existirem escala e ownership independentes.
- **Aplicação em camadas apenas técnicas:** rejeitada porque tende a espalhar regras de negócio entre pastas e aumentar acoplamento.
- **Monólito sem fronteiras:** rejeitado pelo risco de dependências circulares e dificuldade de evolução/teste.

## Consequências

### Positivas

- Deploy e desenvolvimento local simples.
- Transações fortes para fluxos críticos.
- Refatoração de fronteiras com baixo custo enquanto o domínio amadurece.
- Testes integrados e observabilidade centralizados.

### Negativas

- Disciplina é necessária para impedir acoplamento entre módulos.
- Falha ou escala afeta o processo único.
- Extração futura exigirá tornar contratos e dados explícitos.

## Critérios de revisão

Reavaliar somente com evidência de gargalo isolado, necessidade de escala/deploy independente, requisitos de disponibilidade distintos ou ownership autônomo. Nova decisão exige ADR e plano de migração.
