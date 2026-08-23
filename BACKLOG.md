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

> Motivo: o MVP prova o valor central (rastrear lib ↔ projeto) com o menor esforço. As integrações externas e métricas dependem de dados reais no catálogo pra fazerem sentido.

## Sprint 1 — Fundação

- [ ] Scaffold do monorepo (turborepo + pnpm workspaces)
- [ ] `apps/api`: Fastify rodando com rota de health check
- [ ] `apps/web`: Next.js rodando, página em branco
- [ ] `Dockerfile` de desenvolvimento em `apps/api` e `apps/web`, funcionando via `docker compose up -d --build`
- [ ] `packages/db`: schema Drizzle inicial (users, projects, libraries, categories, tags, project_libraries, library_tags)
- [ ] Migration inicial rodando contra Postgres local
- [ ] Pipeline GitHub Actions básico: build + lint + test em cada PR

## Sprint 2 — Autenticação

- [ ] Rota de registro (hash argon2)
- [ ] Rota de login (emite access + refresh token)
- [ ] Middleware de autenticação no Fastify
- [ ] Rota de refresh token
- [ ] Tela de login funcional (web)

## Sprint 3 — Núcleo: projetos e bibliotecas

- [ ] CRUD de projetos (api + web)
- [ ] CRUD de bibliotecas — cadastro manual, sem integração externa ainda (api + web)
- [ ] Categorias predefinidas no seed do banco
- [ ] Tags livres (criar/associar)
- [ ] Dashboard de projetos (lista)
- [ ] Tela de detalhe do projeto (tabela de bibliotecas)
- [ ] Tela de detalhe da biblioteca (notas, usado em)

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
