# Decisões técnicas — DevLib

Registro de decisões que não são óbvias só de olhar o código. Adicione uma entrada sempre que uma tarefa envolver escolha entre alternativas, um trade-off, ou algo que alguém (humano ou agente, numa sessão futura) provavelmente vai perguntar "por que foi feito assim?".

Isso existe porque um PR mesclado guarda o "o quê", mas geralmente perde o "por quê" — e sem isso, um agente numa sessão nova corre o risco de "corrigir" uma decisão proposital achando que é um erro.

## Formato de cada entrada

```
### [data] Título curto da decisão

**Contexto**: o que motivou a decisão
**Decisão**: o que foi escolhido
**Alternativas consideradas**: o que mais foi cogitado, e por que não
**Consequências**: o que isso implica pra frente
```

## Registro

### 2026-08-23 Vitest como test runner

**Contexto**: precisávamos de um test runner rápido e nativo em TypeScript pro monorepo, com specs co-localizadas.
**Decisão**: Vitest.
**Alternativas consideradas**: Jest — mais maduro, mas configuração de TS/ESM mais pesada e watch mode mais lento.
**Consequências**: todo novo pacote no monorepo precisa configurar o Vitest no seu `package.json`/`vitest.config.ts`.

### 2026-08-23 GitHub Actions em vez de Harness

**Contexto**: Harness foi a escolha inicial de CI/CD, mas seu conjunto de recursos é voltado a cenários enterprise (múltiplos ambientes, Kubernetes, aprovações em cadeia) que não se aplicam a este projeto no estágio atual.
**Decisão**: GitHub Actions, com workflows separados por escopo (`ci-api.yml`, `ci-web.yml`) usando path filters.
**Alternativas consideradas**: Harness — mantido como opção caso o projeto cresça para múltiplos ambientes/nuvens no futuro.
**Consequências**: pipeline vive dentro do próprio repositório, sem conta externa nem conector pra manter.

### 2026-08-23 Deploy adiado — tudo local via docker-compose até a finalização do projeto

**Contexto**: a decisão anterior de deploy via VPS + PM2 foi tomada cedo demais — o projeto ainda está em desenvolvimento ativo e ganha mais validando localmente primeiro.
**Decisão**: `docker-compose.yml` agora sobe a stack inteira (Postgres, API, Web) localmente, com `Dockerfile`s de desenvolvimento em `apps/api` e `apps/web` (hot reload, sem build de produção). O workflow `cd-api.yml` foi removido — nenhum deploy automático existe neste momento.
**Alternativas consideradas**: manter o `cd-api.yml` desativado (comentado) em vez de remover — descartado por poluir o repo com um workflow inerte que pode confundir uma sessão futura.
**Consequências**: quando o projeto estiver pronto para produção, será necessário: (1) recriar o workflow de CD, (2) escrever `Dockerfile`s de produção multi-stage (mais otimizados que os de dev atuais), e (3) fazer o setup manual do VPS (Node, pnpm, PM2 ou Docker). Até lá, `ci-api.yml`/`ci-web.yml` continuam validando cada PR normalmente — CI (validação) e CD (deploy) são decisões independentes.

### 2026-08-23 Rota de health check sem validação zod

**Contexto**: `CLAUDE.md` exige validação zod em toda rota nova de `apps/api/src/routes`.
**Decisão**: `GET /health` não implementa schema zod porque não recebe nenhum input (sem query, params ou body) — não há o que validar.
**Alternativas consideradas**: schema zod vazio só para manter uniformidade — descartado por ser código morto sem propósito.
**Consequências**: rotas futuras sem input podem seguir o mesmo raciocínio; qualquer rota que receba query/params/body continua exigindo zod normalmente. Se isso "parecer" uma violação numa sessão futura, não é — é intencional.

### 2026-08-23 `packages/config` fica vazio nesta subtask

**Contexto**: o Sprint 1 pede `packages/config` "pronto para uso futuro", mas ainda não existe um segundo consumidor real de configuração compartilhada (só `apps/api` e `apps/web`, cada um com necessidades próprias de eslint/tsconfig).
**Decisão**: `packages/config` contém só um `package.json` placeholder; `apps/api` e `apps/web` mantêm `eslint.config.js`/`tsconfig.json` próprios por enquanto.
**Alternativas consideradas**: já extrair um eslint/tsconfig compartilhado agora — descartado por ser abstração prematura com apenas dois consumidores e regras diferentes (Next.js vs Node puro).
**Consequências**: quando uma segunda app/package precisar de config idêntica a uma já existente, migrar a config duplicada para `packages/config` nesse momento — não antes.

### 2026-08-23 Porta do Next.js fixada via CLI, não via `.env` compartilhado

**Contexto**: `docker-compose.yml` usa o mesmo `.env` (com uma única variável `PORT=3333`, destinada à API) como `env_file` para os serviços `api` e `web`. O Next.js lê `PORT` do ambiente automaticamente, então o `web` tentava subir na porta 3333 e colidia com a API — descoberto ao validar `docker compose up -d --build` nesta subtask.
**Decisão**: `apps/web/package.json` fixa a porta via CLI (`next dev -p 3000` / `next start -p 3000`), independente do valor de `PORT` no `.env` compartilhado.
**Alternativas consideradas**: separar em `API_PORT`/`WEB_PORT` no `.env.example` — mais explícito, mas exige mexer em `.env.example` (e no `.env` local de quem já tiver criado o próprio) fora do escopo desta subtask; ficou para quando alguém revisitar as variáveis de ambiente.
**Consequências**: se `.env.example` ganhar variáveis de porta separadas no futuro, essa flag fixa no script do `web` deve ser revisitada para usar a variável nova em vez do valor fixo `3000`.

### 2026-08-23 `apps/api` usa CommonJS, não ESM

**Contexto**: a primeira versão do scaffold configurou `apps/api` como ESM puro (`"type": "module"` + `module`/`moduleResolution: "NodeNext"`), o que exige escrever a extensão `.js` nos imports relativos mesmo em arquivos `.ts` (ex: `import { buildServer } from "./server.js"`) — é o comportamento correto do TypeScript nesse modo, mas gerou estranheza na revisão por parecer um erro.
**Decisão**: `apps/api` voltou a ser CommonJS (sem `"type": "module"` no `package.json`; `tsconfig.json` não sobrescreve mais `module`/`moduleResolution`, herdando o `NodeNext` da raiz — que sob CommonJS resolve como CJS normal). Imports relativos voltaram a ser sem extensão (`./server`, não `./server.js`).
**Alternativas consideradas**: manter ESM com `.js` nos imports — descartado por ser menos familiar no time e não trazer benefício real neste estágio (sem top-level await, sem necessidade de ESM-only deps); usar `moduleResolution: "Node10"` explícito — descartado por já estar marcado como deprecated pelo próprio TypeScript (remoção prevista na v7).
**Consequências**: se algum pacote futuro só existir em ESM puro (`exports`-only, sem build CJS), `apps/api` vai precisar revisitar essa decisão — até lá, CommonJS é o padrão do app.

### 2026-08-23 Driver Postgres em `packages/db`: `pg` (node-postgres), não `postgres` (postgres.js)

**Contexto**: `packages/db` precisa de um driver Postgres para o Drizzle ORM se conectar ao banco. A proposta inicial era `postgres` (postgres.js), citado como opção leve na documentação do Drizzle.
**Decisão**: `pg` (node-postgres), via `drizzle-orm/node-postgres`, também documentado oficialmente pelo Drizzle como driver suportado.
**Alternativas consideradas**: `postgres` (postgres.js) — mais leve e com tipos TS nativos, mas descartado em favor de `pg` por ser o driver mais estabelecido do ecossistema Node.
**Consequências**: `packages/db` precisa de `@types/pg` como devDependency (diferente de `postgres`, que já vem tipado); `src/client.ts` usa `Pool` de `pg` + `drizzle(pool)` de `drizzle-orm/node-postgres`.

### 2026-08-23 npm workspaces em vez de pnpm workspaces

**Contexto**: ao instalar as dependências novas de `packages/db` (`drizzle-orm`, `pg`, `drizzle-kit`), o `pnpm install` apresentou timeouts de rede repetidos e não-determinísticos (`ERR_SOCKET_TIMEOUT` em pacotes específicos, minutos de espera), mesmo após reduzir `network-concurrency` e `fetch-timeout`. `npm install` rodado manualmente pelo usuário no mesmo ambiente funcionou sem esse problema.
**Decisão**: monorepo passa a usar `npm workspaces` em vez de `pnpm workspaces`. Removidos `pnpm-workspace.yaml` e `pnpm-lock.yaml`; `package.json` da raiz ganhou o campo `workspaces`; CI (`ci-api.yml`, `ci-web.yml`) e os `Dockerfile`s de `apps/api`/`apps/web` trocaram `pnpm install --frozen-lockfile`/`pnpm --filter X run Y` por `npm ci`/`npm run Y -w X`.
**Alternativas consideradas**: investigar a causa raiz do timeout do pnpm neste ambiente (proxy, DNS, limite de conexões) — descartado por consumir tempo sem garantia de solução, quando `npm` já resolveu o problema na prática.
**Consequências**: `pnpm-lock.yaml` não existe mais; `package-lock.json` passa a ser o lockfile commitado. Nenhum `package.json` de `apps/*`/`packages/*` precisou mudar, pois nenhum ainda usava o protocolo `workspace:*` do pnpm. Path filters de `ci-api.yml`/`ci-web.yml` que citavam `pnpm-lock.yaml` foram atualizados para `package-lock.json`.

### 2026-08-23 Passo de migration removido temporariamente de `ci-api.yml`

**Contexto**: `ci-api.yml` já chamava `db:migrate` desde antes de `packages/db` existir, mas esse script nunca foi criado em `apps/api/package.json` — ninguém tinha notado porque o workflow nunca tinha rodado de verdade em `develop` até a PR de setup de `packages/db`. Com o job rodando pela primeira vez, o passo "Rodar migrations no banco de teste" falha com `Missing script: "db:migrate"`.
**Decisão**: remover o passo de `ci-api.yml` por enquanto. Ele volta quando a subtask "Migration inicial" (Sprint 1, `BACKLOG.md`) criar o script `db:migrate` de verdade em `apps/api/package.json`.
**Alternativas consideradas**: criar um script `db:migrate` provisório que não faz nada, só para o CI passar — descartado por ser código morto/enganoso (finge validar migration sem validar nada); deixar o passo falhando até a subtask de migration — descartado porque bloquearia o CI de toda PR futura que tocasse `apps/api` ou `packages/**` até lá, não só desta.
**Consequências**: até a subtask de migration ser feita, `ci-api.yml` não valida migrations contra o Postgres de teste — só lint/build/test. Se esta ausência "parecer" um esquecimento numa sessão futura, não é — reintroduzir o passo faz parte do escopo dessa subtask.

### 2026-08-23 `packages/db/schema.ts`: PK `uuid` e `refresh_tokens.token_hash` guarda hash, não o token

**Contexto**: primeira subtask a definir tabelas de verdade em `packages/db/schema.ts` (`users`, `refresh_tokens`), preparando o terreno pro Sprint 2 (auth JWT).
**Decisão**: chave primária `uuid` (`defaultRandom()`, gerada via `gen_random_uuid()` nativo do Postgres 16+, sem precisar da extensão `pgcrypto`) em todas as tabelas; `refresh_tokens.token_hash` guarda o hash do refresh token, não o valor em texto puro.
**Alternativas consideradas**: `serial` (inteiro autoincrement) — mais simples, chegou a ser a escolha inicial nesta mesma subtask, revertida a pedido do usuário em favor de UUID; guardar o refresh token em texto puro — mais simples de comparar no login, descartado porque um vazamento do banco exporia sessões ativas diretamente (mesmo raciocínio do hash de senha com argon2, aplicado ao token).
**Consequências**: `refresh_tokens.user_id` também é `uuid` (acompanha a PK de `users`). Rotas de auth do Sprint 2 (login/refresh) precisam hashear o token antes de gravar/comparar em `refresh_tokens`, não comparar o valor recebido direto com a coluna.

### 2026-08-23 `drizzle-orm` também como devDependency da raiz (não só de `packages/db`)

**Contexto**: `drizzle-kit generate` falhava com `Please install latest version of drizzle-orm` mesmo com as versões corretas instaladas. Causa raiz: `drizzle-kit` é hoisted para `node_modules` da raiz pelo npm, mas `drizzle-orm` (dependência só de `packages/db`) ficava aninhado em `packages/db/node_modules` — fora do caminho de resolução de módulos ES (`import("drizzle-orm/version")`) que o `drizzle-kit` usa pra checar compatibilidade. Confirmado isolando a causa com um symlink manual antes de decidir a correção definitiva. Também corrigidas as versões de `drizzle-orm`/`drizzle-kit` fixadas errado na subtask anterior (`^0.36.4`/`^0.28.1`, incompatíveis entre si porque caret em versões 0.x só permite patch) para `^0.45.2`/`^0.31.10`.
**Decisão**: adicionar `drizzle-orm` como devDependency também no `package.json` da raiz, com a mesma versão de `packages/db` — isso força o npm a hospedar (hoist) `drizzle-orm` em `node_modules` da raiz, onde `drizzle-kit` consegue resolvê-lo.
**Alternativas consideradas**: symlink manual em `node_modules` — descartado por não ser reproduzível via `npm ci`/lockfile; rodar `drizzle-kit` de outra forma (ex: instalado localmente em `packages/db`) — descartado porque `drizzle-kit` já estava corretamente hoisted e não há necessidade de duplicar a instalação.
**Consequências**: `package.json` da raiz depende de `drizzle-orm` mesmo sem usá-lo diretamente em código — isso é intencional (suporte ao `drizzle-kit`), não redundância a remover numa sessão futura. Se a versão de `drizzle-orm` mudar em `packages/db`, a da raiz precisa acompanhar.

### 2026-08-23 `packages/db`: `.env` da raiz carregado via `dotenv` só em `drizzle.config.ts`, `DATABASE_URL` validada com zod

**Contexto**: `npm run db:studio -w @devlib/db` (e, por extensão, `db:generate`/`db:migrate`) falhava com `DATABASE_URL não definida` quando rodado direto do host — dentro do `docker-compose`, `env_file: .env` injeta as variáveis no container, mas o CLI do `drizzle-kit` rodando fora do Docker não passa por esse caminho, e nada carregava o `.env` da raiz manualmente.
**Decisão**: `packages/db/drizzle.config.ts` carrega o `.env` da raiz explicitamente via `dotenv` (`config({ path: path.resolve(__dirname, "../../.env") })`) antes de `defineConfig`, cobrindo os três scripts (`db:generate`, `db:migrate`, `db:studio`) de uma vez, já que todos passam por esse arquivo de config. Em paralelo, `client.ts#getDatabaseUrl()` passou a validar `DATABASE_URL` com um schema zod (`z.string().regex(...)`) no formato `postgresql://usuario:senha@host:porta/banco`, em vez de só checar `!url` — pega tanto a variável ausente quanto um valor malformado.
**Alternativas consideradas**: carregar o `.env` dentro de `client.ts` (usado também em runtime pela API) — descartado porque em produção/CI as variáveis já vêm do ambiente (Harness/Docker), e carregar um `.env` ali seria um efeito colateral desnecessário fora do escopo de tooling local; `z.string().url()` genérico — descartado por aceitar qualquer URL válida (ex: `https://...`), não só uma connection string Postgres.
**Consequências**: `packages/db` ganhou `dotenv` (devDependency, só usada em `drizzle.config.ts`) e `zod` (dependency, usada em `client.ts`) — primeira dependência explícita de `zod` no monorepo, fixada em `^3.25.76` (v3) para compatibilidade com o peer dependency já esperado por `drizzle-orm`/`drizzle-kit`. Se `client.ts` ganhar mais variáveis de ambiente no futuro, elas entram no mesmo `envSchema`.

### 2026-08-25 `ci-db.yml` dedicado, em vez de incluir `packages/db` nos filtros de `ci-api.yml`/`ci-web.yml`

**Contexto**: `ci-api.yml`/`ci-web.yml` disparam em PRs que tocam `packages/**` (está no `paths:`), mas usam `turbo run ... --filter=api...`/`--filter=web...` — que só inclui o pacote e suas _dependências_. Como nem `apps/api` nem `apps/web` declaram `@devlib/db` como dependência ainda, `packages/db` nunca era de fato lintado/buildado/testado por nenhum workflow, mesmo com os dois passando verde. Confirmado com `turbo run build --filter=api... --dry=json` (e o mesmo para `web`), que retorna só o próprio pacote em `"packages"`.
**Decisão**: workflow novo, `ci-db.yml`, disparando em `paths: ["packages/db/**", "package-lock.json", "turbo.json"]`, rodando lint/build/test com `--filter=@devlib/db` diretamente — sem depender do grafo de dependências de `api`/`web`. Sem serviço de Postgres: `client.spec.ts` confirma que `createDb`/os testes atuais não abrem conexão real.
**Alternativas consideradas**: ampliar o filtro de `ci-api.yml`/`ci-web.yml` para incluir `packages/db` explicitamente (ex: `--filter=api... --filter=@devlib/db`) — descartado por acoplar a validação de um pacote compartilhado ao pipeline de um app específico, quando `packages/db` ainda não é consumido por nenhum dos dois; adicionar `@devlib/db` como dependência de `apps/api` agora só para o filtro `...` funcionar — descartado por ser uma mudança de código motivada por CI, não por necessidade real da aplicação (isso ainda vai acontecer no Sprint 2, organicamente).
**Consequências**: quando `apps/api` passar a depender de fato de `@devlib/db` (Sprint 2), `ci-api.yml` passa a cobri-lo também via `--filter=api...` — nesse ponto, `ci-db.yml` fica redundante com ele (mas não com mudanças em `packages/db` que não afetam `api`/`web` ainda, então pode continuar existindo). Se `packages/shared-types`/`packages/config` ganharem scripts de lint/build/test reais no futuro, replicar o mesmo padrão (workflow dedicado por pacote) em vez de generalizar prematuramente.

### 2026-08-29 Rotas de auth em `apps/api` usam repositório injetável, não Drizzle direto no service

**Contexto**: a subtask "Rota de registro (hash argon2)" (Sprint 2) é a primeira a fazer `apps/api` consumir `@devlib/db` de verdade. `ci-api.yml` já sobe um serviço Postgres para os testes, mas **não roda migrations** nele antes de `npm run test` (gap deixado em aberto pela entrada "Passo de migration removido temporariamente de `ci-api.yml`" acima, ainda não resolvido) — então um teste que abrisse uma conexão real e tentasse ler/escrever na tabela `users` falharia por tabela inexistente, não por bug de verdade.
**Decisão**: `auth.service.ts` recebe a persistência por injeção de dependência (`findUserByEmail`, `insertUser`), não a instância do Drizzle diretamente. A implementação real desses dois métodos fica isolada em `apps/api/src/repositories/users.repository.ts`. Os specs do service usam fakes/`vi.fn()`, sem abrir conexão — mesmo raciocínio de `packages/db/src/client.spec.ts` ("cria uma instância do Drizzle sem abrir conexão de verdade").
**Alternativas consideradas**: fazer `ci-api.yml` rodar `drizzle-kit migrate` antes dos testes, destravando testes de integração reais — descartado por estar fora do escopo desta subtask (é o gap já registrado, pertence à própria tarefa de reintroduzir a migration no CI); service falar direto com o Drizzle e testar com um fake do client (`db.select().from().where()...`) — descartado por acoplar o teste à forma exata das chamadas encadeadas do Drizzle, mais frágil que fakear duas funções com contrato próprio.
**Consequências**: quando `ci-api.yml` passar a rodar migrations no Postgres de teste, `users.repository.ts` pode ganhar um teste de integração real como complemento (não substituto) dos specs unitários do service. Toda rota de auth futura (login, refresh) que precisar de acesso a dados deve seguir o mesmo padrão de repositório injetável, não instanciar Drizzle dentro do service.

### 2026-08-29 Formato padrão de erro HTTP em `apps/api`: `{ error: "mensagem" }`

**Contexto**: `GET /health` é a única rota existente e nunca retorna erro de negócio (não tem input). A rota de registro é a primeira a precisar de um corpo de erro (400 de validação, 409 de email duplicado), e não havia convenção definida ainda.
**Decisão**: toda resposta de erro de rota em `apps/api` usa `{ error: string }` no corpo — uma mensagem única e legível, sem envelope adicional (`code`, `details`, etc.) nesta fase do projeto.
**Alternativas consideradas**: formato JSON:API-like (`{ errors: [{ status, title, detail }] }`) — descartado por ser complexidade desnecessária para uma API consumida só pelo `apps/web` do próprio monorepo, sem cliente externo hoje.
**Consequências**: toda rota nova (login, refresh, CRUD de projetos/bibliotecas) deve seguir esse mesmo formato para erros; se um consumidor externo precisar de mais estrutura no futuro, revisitar aqui antes de divergir rota a rota.

### 2026-08-29 Política de senha no registro: mínimo 8 caracteres, sem outras regras

**Contexto**: `packages/db/schema.ts` não impõe nenhuma regra sobre a senha (só guarda `password_hash`); a validação de "senha forte o suficiente" precisa ser decidida na camada de rota/zod, e não há requisito explícito no `BACKLOG.md` além de "hash argon2".
**Decisão**: `password` exige só comprimento mínimo de 8 caracteres no schema zod de `POST /auth/register`. Sem exigência de maiúscula/número/símbolo.
**Alternativas consideradas**: regras de complexidade (maiúscula + número + símbolo) — descartado por ser um catálogo pessoal de uso único (não multiusuário/público neste estágio do MVP, ver `BACKLOG.md`), onde fricção extra no cadastro não compra segurança proporcional; nenhum mínimo — descartado por permitir senhas triviais mesmo sob hash argon2.
**Consequências**: se o projeto ganhar multiusuário/exposição pública (`Sprint 6+`/pós-MVP), essa política deve ser revisitada com regras mais rígidas.

### 2026-08-29 Rotas de auth ficam flat em `apps/api/src/routes/`, sem subpasta `auth/`

**Contexto**: Sprint 2 vai adicionar quatro rotas de auth (registro, login, refresh, e o middleware não é rota mas relacionado). O único precedente hoje é `routes/health.route.ts`, direto na raiz de `routes/`, sem agrupamento por domínio.
**Decisão**: `register.route.ts` (e as próximas rotas de auth do sprint) ficam direto em `apps/api/src/routes/`, seguindo o padrão flat já existente — não criar `routes/auth/` agora.
**Alternativas consideradas**: já criar `routes/auth/register.route.ts` antevendo as próximas 3 rotas do sprint — descartado por ser reorganização especulativa antes de existir mais de uma rota de fato; com um único arquivo hoje, uma subpasta não tem o que agrupar ainda.
**Consequências**: quando a segunda rota de auth (login) for implementada, reavaliar se agrupar em `routes/auth/` compensa a essa altura — se sim, mover os arquivos existentes junto nessa subtask, não deixar meio migrado.

### 2026-08-29 Refresh token é um JWT assinado com `JWT_REFRESH_SECRET`, mas seu hash SHA-256 (não argon2) é o que fica em `refresh_tokens.token_hash`

**Contexto**: subtask "Token service (JWT) + repositório de refresh tokens" (Sprint 2, dentro de "Rota de login"). `.env.example` já define `JWT_SECRET` e `JWT_REFRESH_SECRET` como dois segredos separados desde o Sprint 1 — sinal de que o refresh token deveria ser um JWT próprio (verificável sem consulta ao banco), não um valor opaco aleatório. Ao mesmo tempo, `packages/db/schema.ts` guarda `token_hash`, não o token em texto puro (decisão já registrada acima, "PK uuid e refresh_tokens.token_hash guarda hash, não o token"), para permitir revogação (logout, rota de refresh, comprometimento) mesmo antes do JWT expirar naturalmente.
**Decisão**: `signRefreshToken` assina um JWT com `JWT_REFRESH_SECRET` e `JWT_REFRESH_EXPIRES_IN`; o `expiresAt` gravado em `refresh_tokens` vem do próprio `exp` decodificado desse JWT (evita duplicar/parsear a string de duração "7d" em outro lugar). O valor persistido em `token_hash` é o SHA-256 do token em si — não argon2, que é feito para senhas de baixa entropia escolhidas por humanos (parâmetros propositalmente lentos); o refresh token já nasce com entropia alta (assinatura JWT aleatória), então um hash rápido e determinístico já é suficiente pra comparar/revogar sem o custo de argon2 a cada emissão de token.
**Alternativas consideradas**: refresh token opaco (bytes aleatórios, sem estrutura JWT) — descartado por deixar `JWT_REFRESH_SECRET` sem uso e por perder a verificação de assinatura offline que um JWT dá de graça; hashear o refresh token com argon2 como a senha — descartado por ser custo computacional desnecessário (argon2 é lento de propósito) para um valor que já é aleatório e imprevisível por natureza.
**Consequências**: a rota de login (próxima subtask) usa `hashToken` (SHA-256) tanto para gravar quanto, futuramente, a rota de refresh token para comparar o token recebido com o `token_hash` salvo. Se algum dia o projeto precisar de refresh tokens opacos (ex: rotação mais agressiva, tokens menores), essa decisão precisa ser revisitada.
