# DevLib — documentação da aplicação

Este documento descreve o que a aplicação **faz hoje**, mantido atualizado a cada PR mesclado que entrega ou muda uma funcionalidade. Diferente do `CLAUDE.md` (que orienta _como_ o agente deve trabalhar no código) e do `docs/DECISIONS.md` (que registra _por quê_ algo foi escolhido), este arquivo descreve o produto em si — pra qualquer pessoa, ou agente numa sessão nova, entender o estado atual sem precisar ler o histórico inteiro de PRs.

## Status

MVP em desenvolvimento. Ver `BACKLOG.md` para o plano completo de sprints.

## Funcionalidades implementadas

_Atualizar esta seção a cada PR mesclado que entrega uma funcionalidade nova. Uma linha por funcionalidade, não por PR._

- Scaffold do monorepo (Turborepo + npm workspaces), com `apps/api`, `apps/web`, `packages/shared-types` e `packages/config` reconhecidos como workspaces
- API sobe com Fastify e expõe health check
- Web sobe com Next.js (App Router), página inicial ainda em branco
- Stack completa (Postgres + API + Web) validada rodando via `docker compose up -d --build`
- Migrations do `packages/db` validadas contra o Postgres local (8 tabelas, FKs e constraints conferidas); 10 categorias predefinidas semeadas via `npm run db:seed -w @devlib/db` (idempotente)
- Registro de usuário via `POST /auth/register`, com hash argon2 da senha e checagem de email duplicado
- Login via `POST /auth/login`, com verificação de senha (argon2) e emissão de access token + refresh token (JWT)

## Rotas da API

_Atualizar com cada rota nova criada em `apps/api/src/routes`._

| Método | Rota             | Auth? | Descrição                                                            |
| ------ | ---------------- | ----- | -------------------------------------------------------------------- |
| GET    | `/health`        | Não   | Health check — retorna `{ status: "ok" }`                            |
| POST   | `/auth/register` | Não   | Cadastra usuário (email + senha); retorna `{ id, email, createdAt }` |
| POST   | `/auth/login`    | Não   | Login (email + senha); retorna `{ accessToken, refreshToken }`       |

## Telas do frontend

_Atualizar com cada tela nova implementada em `apps/web`._

| Tela | Rota | Descrição                                          |
| ---- | ---- | -------------------------------------------------- |
| Home | `/`  | Página em branco (placeholder do scaffold inicial) |

## Modelo de dados

O modelo de dados vivo é o `packages/db/schema.ts` — não duplicar aqui. Em caso de dúvida sobre uma tabela, ler o schema diretamente.
