# Dockerfile de desenvolvimento — roda o Next.js em modo dev dentro do container.
# Uma versão de produção (multi-stage, build otimizado) só será criada quando o
# projeto estiver pronto para deploy (ver docs/DECISIONS.md).

FROM node:20-alpine

WORKDIR /app

RUN corepack enable

# Copia o monorepo inteiro — necessário porque pnpm workspaces resolve
# dependências entre apps/web e packages/* a partir da raiz.
COPY . .

RUN pnpm install --frozen-lockfile

EXPOSE 3000

CMD ["pnpm", "--filter", "web", "run", "dev"]
