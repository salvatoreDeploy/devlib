---
name: nova-rota-crud
description: Use ao criar rotas REST CRUD novas em apps/api/src/routes (create/list/get/update/delete) para um recurso já com repositório + service prontos. Padroniza o esqueleto de cada arquivo — schema zod, autenticação, injeção de repositório, mapeamento de erros de domínio — e o spec correspondente. Invoque com /nova-rota-crud ou ao implementar o item "rotas REST de <recurso> com validação zod" do BACKLOG.md.
---

# Esqueleto de rota REST CRUD (Fastify + zod)

Este projeto já tem duas famílias de rotas CRUD completas seguindo exatamente o mesmo formato: `apps/api/src/routes/projects-*.route.ts` (recurso com dono, escopado por `userId`) e `apps/api/src/routes/libraries-*.route.ts` (recurso de catálogo global, sem dono). Use uma delas como template literal — leia os 5 arquivos (`*-create`, `*-list`, `*-get`, `*-update`, `*-delete`) e seus `.spec.ts` antes de escrever os novos, e copie a estrutura, não reinvente.

## Pré-requisito

O service e o repositório do recurso já existem (`services/<recurso>.service.ts`, `repositories/<recurso>.repository.ts`), com os erros de domínio já definidos (`<Recurso>NotFoundError`, `<Recurso>NameAlreadyExistsError` etc.). Esta skill cobre só a camada de rota — se o service/repositório ainda não existe, isso é outra subtask (ver `/nova-feature`).

## Escolher o template certo

- **Recurso com dono** (pertence a um `userId`, ex: `projects`): siga `projects-*.route.ts`. Toda checagem de propriedade fica no service, não na rota — a rota só passa `request.user.id`. 404 (nunca 403) quando o recurso existe mas é de outro usuário.
- **Recurso de catálogo global** (sem dono, ex: `libraries`): siga `libraries-*.route.ts`. Autenticação continua obrigatória, mas sem `userId` em nenhum schema ou chamada de service.

Se não estiver óbvio qual dos dois casos se aplica, pare e pergunte — não assuma.

## Estrutura de cada arquivo de rota

Para cada verbo (`POST`, `GET` lista, `GET :id`, `PATCH :id`, `DELETE :id`), um arquivo `<recurso>-<acao>.route.ts`:

1. Schemas zod: `body`/`params` de entrada com `.describe(...)` em cada campo, schema de resposta de sucesso, `errorResponseSchema` padrão (`{ error: string }`).
2. `export type <Recurso><Acao>RouteOptions = { <recurso>Repository?: <Recurso>Repository; authConfig?: AuthConfig }`.
3. Dentro do plugin: repositório injetável via `opts`, com fallback lazy que monta `createDb(getDatabaseUrl())` — se o service precisar de mais de um repositório combinado (ex: `libraries` + `categories`), monte o objeto combinado aqui, não no service.
4. `preHandler: createAuthenticateMiddleware(opts.authConfig)`.
5. `schema.tags`, `summary`, `description` (explicando os casos de 404/409 em português) e `security: [{ bearerAuth: [] }]` no OpenAPI.
6. Handler: chama a função do service dentro de `try/catch`, mapeia cada erro de domínio pro status HTTP certo (`NotFoundError` → 404, `AlreadyExistsError` → 409), `throw error` pra qualquer erro não mapeado (cai no error handler global).

## Spec de cada rota

Um `.spec.ts` co-localizado por arquivo de rota, escrito **antes** da implementação (ver `/nova-feature` passo 2), com:

- `fakeAuthConfig` + helper `authHeader(userId)` assinando um token real via `signAccessToken`.
- Fake do repositório com todos os métodos mockados via `vi.fn()`, overrides por teste.
- Casos mínimos: sucesso (2xx), cada erro de domínio mapeado (404/409), validação zod (400, só na rota de create/update), e sempre "retorna 401 quando não há token de acesso".

## Registrar em server.ts

Depois dos 5 arquivos + specs passando:

1. Importar cada rota e seu `*RouteOptions` em `apps/api/src/server.ts`.
2. Estender `BuildServerDeps` com os 5 novos `*RouteOptions`.
3. Adicionar uma entrada em `tags` do Swagger explicando o recurso (com dono ou global — deixe explícito, é a diferença de comportamento mais fácil de esquecer).
4. `app.register(<recurso><Acao>Route, deps)` para cada uma, na mesma ordem create/list/get/update/delete das rotas existentes.

## Depois

Siga o resto do fluxo normal de `/nova-feature` (passo 4 em diante: lint/build/test, `/revisar-pr`, atualizar `docs/APP.md` com a tabela de rotas novas).
