# DevLib

Catálogo pessoal de bibliotecas, frameworks e ferramentas usadas em projetos de desenvolvimento — rastreia qual versão de qual lib foi usada em qual projeto, com snippets de instalação/configuração e notas.

Para o que a aplicação já faz hoje, ver [`docs/APP.md`](./docs/APP.md). Para o plano de sprints, ver [`BACKLOG.md`](./BACKLOG.md). Para como o Claude Code deve trabalhar neste repo, ver [`CLAUDE.md`](./CLAUDE.md).

## Stack

- **Monorepo**: Turborepo + pnpm workspaces
- **Frontend** (`apps/web`): Next.js
- **Backend** (`apps/api`): Node.js + Fastify (API REST desacoplada)
- **ORM**: Drizzle ORM
- **Banco**: PostgreSQL
- **Testes**: Vitest, specs co-localizadas
- **CI**: GitHub Actions (valida cada PR)
- **Deploy**: adiado até a finalização do projeto — tudo roda localmente por enquanto (ver `docs/DECISIONS.md`)

## Rodando localmente

Pré-requisitos: Docker e Docker Compose. (Node 20 + pnpm são úteis localmente também, para lint/type-check no editor, mas não obrigatórios para rodar a aplicação.)

```bash
# copiar e preencher as variáveis de ambiente
cp .env.example .env

# subir banco, api e web juntos
docker compose up -d --build

# acompanhar logs
docker compose logs -f
```

- Web: http://localhost:3000
- API: http://localhost:3333
- Postgres: localhost:5432

Para rodar as migrations do banco:

```bash
docker compose exec api pnpm --filter api run db:migrate
```

## Comandos úteis

```bash
turbo run lint                        # lint em tudo
turbo run build --filter=api          # build só do backend
turbo run test --filter=web...        # testes só do que afeta o frontend
```

## Contribuindo

Ver [`CONTRIBUTING.md`](./CONTRIBUTING.md) para o fluxo de branches e o checklist de aprovação de PR.
