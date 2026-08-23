# CLAUDE.md

Instruções persistentes para o Claude Code neste repositório. Leia isto antes de qualquer alteração.

## Visão geral do projeto

DevLib é um catálogo pessoal de bibliotecas, frameworks e ferramentas usadas em projetos de desenvolvimento — permite rastrear qual versão de qual lib foi usada em qual projeto, com snippets de instalação/configuração e notas.

## Stack

- **Monorepo**: Turborepo + pnpm workspaces
- **Frontend** (`apps/web`): Next.js
- **Backend** (`apps/api`): Node.js + Fastify (API REST desacoplada)
- **ORM**: Drizzle ORM
- **Banco**: PostgreSQL
- **Auth**: JWT próprio (access token curto + refresh token), hash de senha com argon2
- **Pacotes compartilhados**: `packages/shared-types` (tipos/DTOs), `packages/config` (eslint/tsconfig), `packages/db` (schema Drizzle)
- **CI/CD**: Harness (`harness/pipeline-web.yaml`, `harness/pipeline-api.yaml`)

## Estrutura de pastas

```
apps/web/       # Next.js — só consome a API via HTTP, nunca acessa o banco direto
apps/api/       # Fastify — rotas, services, providers (npm/pypi), schema Drizzle
packages/
```

## Comandos essenciais

- `pnpm install` — instala dependências do monorepo
- `turbo run dev` — sobe web + api em paralelo
- `turbo run build --filter=api` — builda só o backend
- `turbo run test --filter=api...` — testa só o que foi afetado por mudanças na api
- `turbo run lint`

## Convenções — sempre seguir

- Nunca acessar o banco diretamente de `apps/web`. Toda leitura/escrita passa pela API em `apps/api`.
- Toda rota nova em `apps/api/src/routes` precisa de validação de entrada com zod.
- Integrações com gerenciadores de pacotes externos (npm, PyPI) ficam isoladas em `apps/api/src/providers/*` — nunca chamar a API externa direto de dentro de uma rota ou service.
- Mudança em `packages/db/schema.ts` sempre vem acompanhada de uma migration Drizzle no mesmo PR.
- Nunca commitar segredos (`JWT_SECRET`, `DATABASE_URL`). Usar `.env` (gitignored) localmente e variáveis do Harness em CI/CD.
- Senhas sempre com hash argon2, nunca texto puro nem outro algoritmo.
- Branch por feature a partir de `develop`, seguindo git flow (`feature/*`, `release/*`, `hotfix/*`). Nunca commitar direto em `main`.

## Definition of done de um PR

Ver `CONTRIBUTING.md` para o checklist completo antes de abrir um PR para revisão humana.
