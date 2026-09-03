# Backlog e plano de sprints — DevLib

Documento de referência única para saber o que fazer a cada dia. Atualizar os checkboxes conforme o trabalho avança — não recriar este arquivo do zero.

## Quebrando um item em tasks menores

Um item de sprint pode (e deve, quando grande) ser quebrado em subtasks antes de começar a implementar — isso é decidido no passo 0 da skill `nova-feature`. Quando isso acontecer, registre as subtasks aqui mesmo, indentadas sob o item original, cada uma virando seu próprio ciclo completo (plano → specs → código → testes → PR):

```
- [ ] Cadastro de biblioteca (manual)
  - [ ] Rota POST /libraries com validação zod
  - [ ] Service de criação + verificação de duplicidade
  - [ ] Tela de formulário no web
  - [ ] Ligação form → rota
```

Cada subtask vira um PR pequeno e revisável, não um PR gigante no final. Marcar a subtask como concluída só depois do PR dela ser mesclado — o item pai só é marcado quando todas as subtasks estiverem feitas.

## Escopo do MVP

Entra no MVP (v1):

- Login/registro com JWT
- CRUD de projetos
- CRUD de bibliotecas (cadastro manual)
- Associação projeto ↔ biblioteca (nos dois sentidos)
- Categorias predefinidas + tags livres
- Notas por biblioteca

Fica para depois do MVP (v1.1+):

- Integração automática com npm/PyPI (busca e autopreenchimento)
- Snippets de instalação/configuração
- Dashboard de métricas
- Multiusuário/times
- API pública com chave de API (endpoint read-only pra consultar bibliotecas de um projeto fora do app)

> Motivo: o MVP prova o valor central (rastrear lib ↔ projeto) com o menor esforço. As integrações externas e métricas dependem de dados reais no catálogo pra fazerem sentido.

## Sprint 1 — Fundação

- [x] Scaffold do monorepo (turborepo + npm workspaces)
- [x] `apps/api`: Fastify rodando com rota de health check
- [x] `apps/web`: Next.js rodando, página em branco
- [x] `Dockerfile` de desenvolvimento em `apps/api` e `apps/web`, funcionando via `docker compose up -d --build`
- [x] `packages/db`: schema Drizzle inicial (users, projects, libraries, categories, tags, project_libraries, library_tags)
  - [x] `packages/db`: setup do pacote (package.json, config do Drizzle, conexão)
  - [x] `packages/db`: schema de users + refresh_tokens
  - [x] `packages/db`: schema de categories + tags
  - [x] `packages/db`: schema de libraries + projects
  - [x] `packages/db`: schema das tabelas de associação (project_libraries, library_tags)
- [x] Migration inicial rodando contra Postgres local
  - [x] Validar/rodar as migrations já geradas (uma por subtask de schema) contra o Postgres do docker-compose
  - [x] Seed de categorias predefinidas (valida o schema com dados reais; adianta parte do item de Sprint 3 "Categorias predefinidas no seed do banco")
- [x] Pipeline GitHub Actions básico: build + lint + test em cada PR
  - [x] Validar que ci-api.yml e ci-web.yml passam de verdade agora que existe package.json real em packages/db — corrigir o que falhar

## Sprint 2 — Autenticação

- [x] Rota de registro (hash argon2)
- [x] Rota de login (emite access + refresh token)
  - [x] Token service (JWT) + repositório de refresh tokens
  - [x] Rota de login (POST /auth/login)
- [x] Middleware de autenticação no Fastify
- [x] Implementação de API com Swagger/OpenAPI, utilizando a biblioteca "Swagger" link da biblioteca `https://swagger.io/`
  - [x] Setup Swagger/OpenAPI + type provider (zod)
  - [x] Migrar POST /auth/register para schema nativo (zod)
  - [x] Migrar POST /auth/login para schema nativo (zod)
- [x] Rota de refresh token
  - [x] Extensões de token service + repositório de refresh tokens (verifyRefreshToken, findRefreshTokenByHash, revokeRefreshToken)
  - [x] Rota de refresh token (POST /auth/refresh)
- [x] Tela de login funcional (web)
  - [x] Infra do frontend (Tailwind, TanStack Query, cliente de API, storage de tokens)
  - [x] Tela de login (formulário + rota /login)

## Sprint 3 — Núcleo: projetos e bibliotecas

- [x] CRUD de projetos (api + web)
  - [x] API: repositório + service de projetos (create, list, getById, update, delete)
  - [x] API: rotas REST de projetos com validação zod (POST/GET/GET:id/PATCH/DELETE /projects)
  - [x] Web: formulário de criação de projeto
  - [x] Web: formulário de edição de projeto
- [ ] CRUD de bibliotecas — cadastro manual, sem integração externa ainda (api + web)
  - [ ] API: repositório + service de bibliotecas (create, list, getById, update, delete)
  - [ ] API: rotas REST de bibliotecas com validação zod (inclui categoryId)
  - [ ] Web: formulário de criação de biblioteca (com seleção de categoria)
  - [ ] Web: formulário de edição de biblioteca
- [x] Categorias predefinidas no seed do banco
- [ ] Tags livres (criar/associar)
  - [ ] API: rota/service de criação de tag + associação tag↔biblioteca
  - [ ] Web: componente de input de tags (criar on-the-fly) integrado ao form de biblioteca
- [ ] Dashboard de projetos (lista)
  - [ ] Web: tela /projects (listagem via GET /projects, ação de excluir, links pra criar/detalhe)
- [ ] Tela de detalhe do projeto (tabela de bibliotecas)
  - [ ] API: rota GET /projects/:id/libraries
  - [ ] Web: tela /projects/[id] com dados do projeto + tabela de bibliotecas associadas
- [ ] Tela de detalhe da biblioteca (notas, usado em)
  - [ ] API: rota GET /libraries/:id/projects
  - [ ] Web: tela /libraries/[id] com notas, categoria, tags e projetos onde é usada

## Sprint 4 — Associação cruzada

- [ ] Associar biblioteca a projeto (a partir da tela da biblioteca)
- [ ] Adicionar biblioteca a projeto (a partir da tela do projeto)
- [ ] Remover associação nos dois sentidos

## Sprint 5 — Integrações (pós-MVP)

- [ ] Provider npm (busca + versão + docs)
- [ ] Provider PyPI (busca + versão + docs)
- [ ] Autopreenchimento no formulário de cadastro
- [ ] Snippets de instalação/configuração por biblioteca

## Sprint 6 — Métricas (pós-MVP)

- [ ] Query agregada: bibliotecas mais usadas
- [ ] Query agregada: distribuição por categoria
- [ ] Tela de dashboard de métricas

## Sprint 7 — API pública / Developers (pós-MVP)

> Adicionado em 2026-09-02 a partir da tela "Developers" do pacote de design hi-fi — não estava em nenhuma sprint antes disso. Exige um mecanismo de autenticação novo (chave de API), separado do JWT de sessão usado por `apps/web` — decidir o desenho antes de implementar a primeira subtask.

- [ ] Decidir mecanismo de chave de API (formato, revogação, escopo por projeto) — antes de implementar
- [ ] Rota `GET /v1/projects/:id/libraries` autenticada por chave de API (Bearer), somente leitura
- [ ] Tela "Developers" no projeto: gerar/exibir/revogar chave de API, exemplo de `curl`

---

## Rotina diária (fluxo minimalista)

1. Atualizar `develop` local (`git pull`)
2. Escolher **um único item** do sprint atual em andamento — não pular pra outro sprint
3. Criar a branch (`feature/api-...` ou `feature/web-...`)
4. Deixar o agente (Claude Code) implementar o item
5. Rodar o checklist de `CONTRIBUTING.md` antes de aprovar o PR
6. Aprovar e mesclar em `develop` — o GitHub Actions builda e testa automaticamente
7. Marcar o checkbox correspondente neste arquivo
8. Se sobrar tempo, repetir a partir do passo 2 — nunca abrir uma segunda branch em paralelo sem terminar a primeira

> Regra de ouro do fluxo minimalista: **um item por vez, do início ao fim**, antes de começar o próximo.
