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
- Tela de login funcional em `apps/web` (`/login`): formulário com validação client-side (react-hook-form + zod), chama `POST /auth/login`, salva os tokens em `localStorage` e redireciona para `/` no sucesso. Links "esqueci minha senha" (`/forgot-password`) e "criar conta" (`/register`) presentes visualmente (fiéis ao protótipo), mas levam a 404 — as telas de destino ainda não existem
- CRUD de projetos via API (`/projects`), protegido por autenticação (primeiro uso real do middleware `authenticate`): cada projeto pertence a um usuário; acessar/editar/excluir um projeto de outro usuário responde 404 (não revela que o ID existe); nome de projeto duplicado para o mesmo usuário é bloqueado (409).
- Criação de projeto em `apps/web` (`/projects/new`): primeira tela protegida do frontend — sem access token válido em `localStorage`, redireciona para `/login` (hook reutilizável `useRequireAuth`). Formulário nome/descrição, chama `POST /projects` com o token e redireciona para `/` no sucesso.
- Edição de projeto em `apps/web` (`/projects/[id]/edit`): busca o projeto via `GET /projects/:id`, pré-preenche o formulário, envia `PATCH /projects/:id` no submit e redireciona para `/` no sucesso. Mostra erro inline se o projeto não existir/não for do usuário (404) ou se o nome novo colidir com outro projeto (409).
- `@fastify/cors` libera explicitamente `GET, HEAD, POST, PATCH, PUT, DELETE` no preflight — o default do `@fastify/cors@11.3.0` (`GET,HEAD,POST`) bloqueava `PATCH`/`DELETE` em qualquer chamada feita por um navegador de verdade.
- `apps/api` libera CORS só para a origem configurada em `WEB_URL` (`@fastify/cors`, padrão `http://localhost:3000`) e aplica rate limit global (`@fastify/rate-limit`, 100 requisições/minuto por IP) em todas as rotas.
- `apps/web` roda em tema escuro fixo (sem alternância pra claro), com paleta de cores exata (hex) do pacote de design hi-fi entregue em 2026-09-02 — ver tabela completa de tokens em `docs/FRONTEND.md`.
- CRUD de bibliotecas via API (`/libraries`), protegido por autenticação. Diferente de `/projects`, é um catálogo **global** sem dono — qualquer usuário autenticado pode ler, editar ou excluir qualquer biblioteca. Nome de biblioteca duplicado no catálogo é bloqueado (409); `categoryId` inexistente é rejeitado (404) antes de gravar.
- Listagem de categorias globais via API (`GET /categories`), protegida por autenticação — usada pelo formulário de biblioteca pra popular o select de categoria. Só categorias com `projectId: null` (as 10 predefinidas do seed); ainda não existe CRUD de categoria (criação/edição/exclusão) nem categorias por projeto na prática.
- Criação de biblioteca em `apps/web` (`/libraries/new`): formulário nome/categoria/notas, protegida (`useRequireAuth`). Categoria é um `Select` (shadcn/Radix) populado via `GET /categories`; campo opcional — "Sem categoria" fica selecionável. Chama `POST /libraries` com o token e redireciona para `/` no sucesso; mostra erro inline se o nome já existir no catálogo (409).
- Edição de biblioteca em `apps/web` (`/libraries/[id]/edit`): busca a biblioteca via `GET /libraries/:id`, pré-preenche nome/categoria/notas (mesmo select de categoria de `/libraries/new`), envia `PATCH /libraries/:id` no submit e redireciona para `/` no sucesso. Mostra erro inline se a biblioteca não existir (404) ou se o nome novo colidir com outra (409).
- Tags via API (`POST /libraries/:id/tags`), protegido por autenticação. Tags são globais/compartilhadas (sem dono), assim como bibliotecas: se já existir uma tag com o nome informado, ela é reaproveitada; caso contrário, é criada na hora. 404 se a biblioteca não existir, 409 se a tag já estiver associada a essa biblioteca. Ainda não há rota de listagem ou remoção de tag — só criação/associação sob demanda.

## Rotas da API

_Atualizar com cada rota nova criada em `apps/api/src/routes`._

| Método | Rota                  | Auth? | Descrição                                                                                                                                                                       |
| ------ | --------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/health`             | Não   | Health check — retorna `{ status: "ok" }`                                                                                                                                       |
| POST   | `/auth/register`      | Não   | Cadastra usuário (email + senha); retorna `{ id, email, createdAt }`                                                                                                            |
| POST   | `/auth/login`         | Não   | Login (email + senha); retorna `{ accessToken, refreshToken }`                                                                                                                  |
| POST   | `/auth/refresh`       | Não   | Renova a sessão (`{ refreshToken }`); retorna novo `{ accessToken, refreshToken }`                                                                                              |
| POST   | `/projects`           | Sim   | Cria um projeto (`{ name, description? }`) para o usuário autenticado; 409 se o nome já existe pra esse usuário                                                                 |
| GET    | `/projects`           | Sim   | Lista os projetos do usuário autenticado                                                                                                                                        |
| GET    | `/projects/:id`       | Sim   | Detalha um projeto; 404 se não existe ou é de outro usuário                                                                                                                     |
| PATCH  | `/projects/:id`       | Sim   | Atualiza `{ name?, description? }`; 404 se não é do usuário, 409 se o novo nome já existe                                                                                       |
| DELETE | `/projects/:id`       | Sim   | Exclui o projeto; 404 se não é do usuário                                                                                                                                       |
| POST   | `/libraries`          | Sim   | Cria uma biblioteca no catálogo global (`{ name, categoryId?, notes? }`); 409 se o nome já existe, 404 se `categoryId` não existe                                               |
| GET    | `/libraries`          | Sim   | Lista todas as bibliotecas do catálogo (sem filtro por usuário)                                                                                                                 |
| GET    | `/libraries/:id`      | Sim   | Detalha uma biblioteca; 404 se não existe                                                                                                                                       |
| PATCH  | `/libraries/:id`      | Sim   | Atualiza `{ name?, categoryId?, notes? }`; 404 se não existe ou `categoryId` não existe, 409 se o novo nome já existe                                                           |
| DELETE | `/libraries/:id`      | Sim   | Exclui a biblioteca; 404 se não existe                                                                                                                                          |
| GET    | `/categories`         | Sim   | Lista as categorias globais/predefinidas (`projectId: null`); não há CRUD de categoria ainda, só seed                                                                           |
| POST   | `/libraries/:id/tags` | Sim   | Cria e/ou associa uma tag a uma biblioteca (`{ name }`); reaproveita a tag se o nome já existir no catálogo; 404 se a biblioteca não existir, 409 se a tag já estiver associada |

## Telas do frontend

_Atualizar com cada tela nova implementada em `apps/web`._

| Tela              | Rota                   | Descrição                                                                                                                                         |
| ----------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home              | `/`                    | Página em branco (placeholder do scaffold inicial)                                                                                                |
| Login             | `/login`               | Formulário de login (email + senha), redireciona para `/` no sucesso                                                                              |
| Novo projeto      | `/projects/new`        | Formulário de criação de projeto (nome + descrição), protegida (redireciona para `/login` sem sessão), redireciona para `/` no sucesso            |
| Editar projeto    | `/projects/[id]/edit`  | Formulário de edição de projeto, pré-preenchido via `GET /projects/:id`, protegida, redireciona para `/` no sucesso                               |
| Nova biblioteca   | `/libraries/new`       | Formulário de criação de biblioteca (nome + categoria via select + notas), protegida, redireciona para `/` no sucesso                             |
| Editar biblioteca | `/libraries/[id]/edit` | Formulário de edição de biblioteca, pré-preenchido via `GET /libraries/:id` (nome, categoria e notas), protegida, redireciona para `/` no sucesso |

## Modelo de dados

O modelo de dados vivo é o `packages/db/schema.ts` — não duplicar aqui. Em caso de dúvida sobre uma tabela, ler o schema diretamente.
