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
- Renovação de sessão via `POST /auth/refresh`: valida o refresh token, revoga o usado e emite um par novo (access + refresh) — rotação a cada uso, não reaproveita o token antigo
- Documentação interativa da API (Swagger UI) em `/docs`, gerada a partir dos schemas zod das rotas (`/docs/json` expõe o spec OpenAPI cru). As 4 rotas (`/health`, `/auth/register`, `/auth/login`, `/auth/refresh`) já têm schema completo (request + response)
- Erros de validação (e qualquer erro não tratado) respondem no formato padrão `{ error: string }` via error handler global em `apps/api`
- Tela de login funcional em `apps/web` (`/login`): formulário com validação client-side (react-hook-form + zod), chama `POST /auth/login`, salva os tokens em `localStorage` e redireciona para `/` no sucesso
- CRUD de projetos via API (`/projects`), protegido por autenticação (primeiro uso real do middleware `authenticate`): cada projeto pertence a um usuário; acessar/editar/excluir um projeto de outro usuário responde 404 (não revela que o ID existe); nome de projeto duplicado para o mesmo usuário é bloqueado (409). Ainda sem tela no `apps/web`.

## Rotas da API

_Atualizar com cada rota nova criada em `apps/api/src/routes`._

| Método | Rota             | Auth? | Descrição                                                                                                       |
| ------ | ---------------- | ----- | --------------------------------------------------------------------------------------------------------------- |
| GET    | `/health`        | Não   | Health check — retorna `{ status: "ok" }`                                                                       |
| POST   | `/auth/register` | Não   | Cadastra usuário (email + senha); retorna `{ id, email, createdAt }`                                            |
| POST   | `/auth/login`    | Não   | Login (email + senha); retorna `{ accessToken, refreshToken }`                                                  |
| POST   | `/auth/refresh`  | Não   | Renova a sessão (`{ refreshToken }`); retorna novo `{ accessToken, refreshToken }`                              |
| POST   | `/projects`      | Sim   | Cria um projeto (`{ name, description? }`) para o usuário autenticado; 409 se o nome já existe pra esse usuário |
| GET    | `/projects`      | Sim   | Lista os projetos do usuário autenticado                                                                        |
| GET    | `/projects/:id`  | Sim   | Detalha um projeto; 404 se não existe ou é de outro usuário                                                     |
| PATCH  | `/projects/:id`  | Sim   | Atualiza `{ name?, description? }`; 404 se não é do usuário, 409 se o novo nome já existe                       |
| DELETE | `/projects/:id`  | Sim   | Exclui o projeto; 404 se não é do usuário                                                                       |

## Telas do frontend

_Atualizar com cada tela nova implementada em `apps/web`._

| Tela  | Rota     | Descrição                                                            |
| ----- | -------- | -------------------------------------------------------------------- |
| Home  | `/`      | Página em branco (placeholder do scaffold inicial)                   |
| Login | `/login` | Formulário de login (email + senha), redireciona para `/` no sucesso |

## Modelo de dados

O modelo de dados vivo é o `packages/db/schema.ts` — não duplicar aqui. Em caso de dúvida sobre uma tabela, ler o schema diretamente.
