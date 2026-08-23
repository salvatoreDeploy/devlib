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
