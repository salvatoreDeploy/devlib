# Dockerfile de desenvolvimento — roda o servidor com hot reload dentro do container.
# Uma versão de produção (multi-stage, build otimizado) só será criada quando o
# projeto estiver pronto para deploy (ver docs/DECISIONS.md).

FROM node:20-alpine

WORKDIR /app

# Copia o monorepo inteiro — necessário porque npm workspaces resolve
# dependências entre apps/api e packages/* a partir da raiz.
COPY . .

RUN npm ci

EXPOSE 3333

CMD ["npm", "run", "dev", "-w", "api"]
