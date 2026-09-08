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
- [x] CRUD de bibliotecas — cadastro manual, sem integração externa ainda (api + web)
  - [x] API: repositório + service de bibliotecas (create, list, getById, update, delete)
  - [x] API: rotas REST de bibliotecas com validação zod (inclui categoryId)
  - [x] API: rota GET /categories (lista categorias globais, pra popular o select do formulário de biblioteca)
  - [x] Web: formulário de criação de biblioteca (com seleção de categoria)
  - [x] Web: formulário de edição de biblioteca
- [x] Categorias predefinidas no seed do banco
- [x] Tags livres (criar/associar)
  - [x] API: rota/service de criação de tag + associação tag↔biblioteca
  - [x] API: rota GET /libraries/:id/tags (lista tags de uma biblioteca) — necessária para o form de edição mostrar as tags atuais
  - [x] Web: componente de input de tags (criar on-the-fly) integrado ao form de biblioteca
- [x] Dashboard de projetos (lista)
  - [x] Web: tela /projects (listagem via GET /projects, ação de excluir, links pra criar/detalhe)
- [x] Tela de detalhe do projeto (tabela de bibliotecas)
  - [x] API: rota GET /projects/:id/libraries
  - [x] Web: tela /projects/[id] com dados do projeto + tabela de bibliotecas associadas
  - [x] Web: Elaborar tela home alinhada com nosso projeto, e navegação entre as telas.
- [x] Tela de detalhe da biblioteca (notas, usado em)
  - [x] API: rota GET /libraries/:id/projects
  - [x] Web: tela /libraries/[id] com notas, categoria, tags e projetos onde é usada
- [ ] Seção "Bibliotecas" na Home (lista)
  - [ ] API: rota GET /libraries/overview (lista bibliotecas do catálogo com `projectsCount` — quantidade de projetos do usuário autenticado que usam cada uma)
  - [ ] Web: seção "Bibliotecas" na Home (`/`) — usa GET /libraries/overview, categoria resolvida via GET /categories, coluna "usada em" com a contagem e uma badge de status visual (valor fixo, sem integração real de versão ainda — ver Sprint 6), ação "+ Nova biblioteca" pra /libraries/new, linha linka pro detalhe /libraries/[id]; remove o card "Bibliotecas" do hub atual (a seção substitui o destino, seguindo a "Dashboard Libraries Section" do devlib_design.pen)

## Sprint 4 — Refatoração Front-end com Design System e Refatoração do Back-end

> Fonte: `devlib_design.pen`, que passa a ser a fonte da verdade de `docs/FRONTEND.md` (substitui o pacote HTML hi-fi de 2026-09-02 — ver `docs/DECISIONS.md`). Reverte a decisão de manter `/projects/new` como página cheia em vez de drawer (`docs/FRONTEND.md`, decisão de 2026-09-02) — os fluxos de criação/detalhe voltam a ser drawers, como no design original. Fora de escopo: abas "Métricas" e "Developers" (permanecem desabilitadas, tratadas nas Sprints 7 e 8), telas públicas "Presentation" e "Blog" (Sprint 9), campos de organização/plano/função/membros/billing (multiusuário é pós-MVP), busca de pacote npm/PyPI no drawer de biblioteca (Sprint 6), associação biblioteca↔projeto no drawer de detalhe (Sprint 5) e a seção "Preferências" do perfil (sem dado real por trás ainda).

- [ ] `.pen` vira fonte da verdade do design system
  - [ ] Doc: nova entrada em `docs/DECISIONS.md` (supersede a de 2026-09-02) — `.pen` como fonte da verdade, reversão da decisão página-vs-drawer
  - [ ] Doc: `docs/FRONTEND.md` reescrito a partir dos tokens/telas do `devlib_design.pen`
- [ ] Componentes base do design system (web)
  - [ ] Web: Button/Input/Badge/Tab/Metric Card revisados pra bater com os componentes reutilizáveis do `.pen`
  - [ ] Web: componente Drawer (Sheet) padrão com overlay, base pros fluxos de criação/detalhe abaixo
- [ ] Perfil do usuário (api + web)
  - [ ] `packages/db`: migration adicionando `name` e `avatarUrl` a `users`
  - [ ] API: rota GET /users/me
  - [ ] API: rota PATCH /users/me (nome, e-mail, senha)
  - [ ] API: rota POST /users/me/photo
  - [ ] API: rota POST /auth/logout
  - [ ] Web: Profile Dropdown no header (nome/e-mail/avatar, ações "Editar perfil" e "Sair")
  - [ ] Web: tela /profile (foto, dados pessoais, alteração de senha)
- [ ] Header e Home (web)
  - [ ] Web: Header alinhado ao Dashboard Header do `.pen`, com ProfileButton real (abre o Profile Dropdown)
  - [ ] Web: Home (`/`) restilizada nos tokens/componentes novos, mantendo o hub de cards e a seção "Bibliotecas" (Sprint 3) — sem feed de atividade recente nem card de plano/billing (dependem de multiusuário, pós-MVP)
- [ ] Fluxos de criação/detalhe migram de página pra drawer (web)
  - [ ] Web: Drawer "Criar projeto" substitui /projects/new
  - [ ] Web: Drawer "Criar biblioteca" substitui /libraries/new
  - [ ] Web: Drawer "Detalhe da biblioteca" substitui /libraries/[id]
  - [ ] Web: atualizar links/redirects que apontavam pras páginas antigas
- [ ] Aba Categorias do projeto (api + web)
  - [ ] API: repositório + service de categorias (criar, listar globais+do projeto, bloquear nome duplicado no mesmo escopo)
  - [ ] API: rotas REST de categorias com validação zod (POST/GET/DELETE /projects/:id/categories)
  - [ ] Web: tela "Categorias" (tabela + busca) na tab bar do projeto
  - [ ] Web: Drawer "Criar categoria"
- [ ] Testes
  - [ ] API: testes unitários/integração de perfil, logout e categorias
  - [ ] Web: testes E2E dos drawers e do menu de perfil

## Sprint 5 — Associação cruzada

- [ ] Associar biblioteca a projeto (a partir da tela da biblioteca)
- [ ] Adicionar biblioteca a projeto (a partir da tela do projeto)
- [ ] Remover associação nos dois sentidos

## Sprint 6 — Integrações (pós-MVP)

- [ ] Provider npm (busca + versão + docs)
- [ ] Provider PyPI (busca + versão + docs)
- [ ] Autopreenchimento no formulário de cadastro
- [ ] Snippets de instalação/configuração por biblioteca

## Sprint 7 — Métricas (pós-MVP)

- [ ] Query agregada: bibliotecas mais usadas
- [ ] Query agregada: distribuição por categoria
- [ ] Tela de dashboard de métricas

## Sprint 8 — API pública / Developers (pós-MVP)

> Adicionado em 2026-09-02 a partir da tela "Developers" do pacote de design hi-fi — não estava em nenhuma sprint antes disso. Exige um mecanismo de autenticação novo (chave de API), separado do JWT de sessão usado por `apps/web` — decidir o desenho antes de implementar a primeira subtask.

- [ ] Decidir mecanismo de chave de API (formato, revogação, escopo por projeto) — antes de implementar
- [ ] Rota `GET /v1/projects/:id/libraries` autenticada por chave de API (Bearer), somente leitura
- [ ] Tela "Developers" no projeto: gerar/exibir/revogar chave de API, exemplo de `curl`

## Sprint 9 — Landing pública e Blog (pós-MVP)

> Adicionado em 2026-09-08 a partir das telas "Presentation" e "Public Blog" do `devlib_design.pen` — páginas públicas (sem autenticação), fora do escopo do MVP atual. Duas decisões em aberto antes de implementar a primeira subtask: (1) hoje `/` é o hub autenticado (Home) — decidir a rota real da landing pública sem colidir com ela; (2) fonte de conteúdo do blog (CMS externo, markdown no repo, tabela no banco).

- [ ] Decidir rota da landing pública e fonte de conteúdo do blog — antes de implementar
- [ ] Landing page pública (web)
  - [ ] Web: tela pública (Presentation Screen) — hero, cards de features, sem sessão
  - [ ] Web: header/nav públicos (sem ProfileButton)
- [ ] Blog público (api + web)
  - [ ] Web: tela de listagem do blog (Public Blog Screen)

---

## Dívida técnica / bugs conhecidos

_Achados durante o desenvolvimento que não bloqueiam a subtask em andamento, mas precisam de uma subtask própria depois. Não remover daqui sem resolver ou mover pra dentro de um sprint._

- [ ] Web: não existe fluxo de logout em nenhuma tela — usuário não tem como encerrar a sessão manualmente hoje, só esperando o access token expirar (15 min) ou limpando o `localStorage` à mão. Adicionar logout nas telas que precisam dele (provavelmente um botão/menu visível nas telas protegidas, chamando `clearTokens()` e redirecionando pra `/login`) — ver `docs/FRONTEND.md` se já existe um padrão de header/nav previsto pro protótipo antes de desenhar um novo.

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
