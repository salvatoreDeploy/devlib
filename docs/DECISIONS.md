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
