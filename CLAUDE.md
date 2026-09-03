# CLAUDE.md

Instruções persistentes para o Claude Code neste repositório. Leia isto antes de qualquer alteração.

## Visão geral do projeto

DevLib é um catálogo pessoal de bibliotecas, frameworks e ferramentas usadas em projetos de desenvolvimento — permite rastrear qual versão de qual lib foi usada em qual projeto, com snippets de instalação/configuração e notas.

## Stack

- **Monorepo**: Turborepo + npm workspaces
- **Frontend** (`apps/web`): Next.js
- **Backend** (`apps/api`): Node.js + Fastify (API REST desacoplada)
- **ORM**: Drizzle ORM
- **Banco**: PostgreSQL
- **Auth**: JWT próprio (access token curto + refresh token), hash de senha com argon2
- **Testes**: Vitest, arquivos `.spec.ts` co-localizados (ao lado do arquivo testado, não em pasta `tests/` separada)
- **Deploy**: adiado até a finalização do projeto. Por enquanto, tudo roda localmente via `docker-compose.yml` (Postgres + API + Web). Ver `docs/DECISIONS.md` para o motivo.
- **Pacotes compartilhados**: `packages/shared-types` (tipos/DTOs), `packages/config` (eslint/tsconfig), `packages/db` (schema Drizzle)
- **CI/CD**: GitHub Actions (`.github/workflows/ci-web.yml`, `.github/workflows/ci-api.yml`)

## Estrutura de pastas

```
apps/web/       # Next.js — só consome a API via HTTP, nunca acessa o banco direto
apps/api/       # Fastify — rotas, services, providers (npm/pypi), schema Drizzle
packages/
```

## Comandos essenciais

- `cp .env.example .env` — variáveis de ambiente necessárias, ver o arquivo para a lista completa
- `docker compose up -d --build` — sobe Postgres, API e Web juntos, localmente (ver `docker-compose.yml`)
- `docker compose logs -f api` — acompanhar logs de um serviço específico
- `npm install` — instala dependências do monorepo (necessário mesmo usando Docker, para lint/type-check no editor)
- `npm run dev` (raiz) — sobe web + api em paralelo **fora do Docker**, carregando o `.env` da raiz antes (`set -a && . ./.env && set +a && turbo run dev`) — `apps/api` não lê `.env` sozinho em runtime (só `packages/db/drizzle.config.ts` faz isso, e só pra tooling do `drizzle-kit`), então chamar `turbo run dev` direto sem isso quebra com `DATABASE_URL inválida ou não definida`. Preferir `docker compose up -d --build` quando possível — é o caminho já validado ponta a ponta.
- `turbo run build --filter=api` — builda só o backend
- `turbo run test --filter=api...` — testa só o que foi afetado por mudanças na api
- `turbo run lint`

## Convenções — sempre seguir

- Nunca acessar o banco diretamente de `apps/web`. Toda leitura/escrita passa pela API em `apps/api`.
- Toda tela nova ou alterada em `apps/web` segue os padrões visuais de `docs/FRONTEND.md` (estilo denso, shadcn/ui, densidade de listas/tabelas, paleta de badges, etc.) — não inventar um estilo próprio quando o documento já cobre o caso.
- Toda rota nova em `apps/api/src/routes` precisa de validação de entrada com zod.
- Integrações com gerenciadores de pacotes externos (npm, PyPI) ficam isoladas em `apps/api/src/providers/*` — nunca chamar a API externa direto de dentro de uma rota ou service.
- Mudança em `packages/db/schema.ts` sempre vem acompanhada de uma migration Drizzle no mesmo PR.
- Nunca commitar segredos (`JWT_SECRET`, `DATABASE_URL`). Usar `.env` (gitignored) localmente e variáveis do Harness em CI/CD.
- Senhas sempre com hash argon2, nunca texto puro nem outro algoritmo.
- Todo arquivo novo em `apps/api/src/routes`, `apps/api/src/services` e `apps/api/src/providers` (e o equivalente em `apps/web`) tem um arquivo `.spec.ts` correspondente, co-localizado: `library.service.ts` → `library.service.spec.ts` na mesma pasta. Nunca deixar o teste para "depois" — ele nasce junto com o arquivo.
- Branch por feature a partir de `develop`, seguindo git flow (`feature/*`, `release/*`, `hotfix/*`). Nunca commitar direto em `main`.

## Definition of done de um PR

Ver `CONTRIBUTING.md` para o checklist completo antes de abrir um PR para revisão humana.

## Documentação viva

Quatro documentos com papéis diferentes — não duplicar conteúdo entre eles:

- `CLAUDE.md` (este arquivo) — como o agente deve trabalhar
- `docs/DECISIONS.md` — por que uma escolha técnica foi feita (evita que uma sessão futura "corrija" algo proposital)
- `docs/APP.md` — o que a aplicação faz hoje (funcionalidades, rotas, telas)
- `docs/FRONTEND.md` — padrões visuais e de componentes de apps/web, definidos durante o protótipo de UI (densidade, cores de badge, padrão de tabela/lista/formulário). Consultar antes de implementar qualquer tela nova — não redesenhar do zero o que já foi decidido.

Atualizar `docs/DECISIONS.md` e `docs/APP.md` faz parte do passo 5.5 da skill `nova-feature` — não é opcional nem posterior.

## Skills e subagentes disponíveis

- `/nova-feature` — use ao implementar qualquer item do `BACKLOG.md`, do planejamento ao PR
- `/nova-rota-crud` — use ao criar rotas REST CRUD novas em `apps/api/src/routes` para um recurso já com repositório + service prontos; padroniza o esqueleto (zod, auth, injeção de repositório, mapeamento de erros) usando `projects-*.route.ts`/`libraries-*.route.ts` como templates
- `/novo-form-web` — use ao criar um formulário protegido novo em `apps/web` (criação/edição de um recurso com rota REST já pronta); padroniza cliente de API tipado, `useRequireAuth`, react-hook-form+zod, TanStack Query e tokens visuais, usando `projects/new`, `projects/[id]/edit` e `libraries/new` como templates
- `/revisar-pr` — use antes de sugerir abrir um PR, faz a autoavaliação contra o checklist
- `/propor-skill` — use ao perceber um padrão repetido; propõe nova skill/hook/subagente, nunca cria sem aprovação
- Subagente `revisor-arquitetura` (somente leitura) — audita conformidade com a arquitetura acima; use antes de um PR ou quando pedir uma checagem de conformidade
