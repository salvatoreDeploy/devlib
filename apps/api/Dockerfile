# Dockerfile de desenvolvimento — roda o servidor com hot reload dentro do container.
# Uma versão de produção (multi-stage, build otimizado) só será criada quando o
# projeto estiver pronto para deploy (ver docs/DECISIONS.md).

FROM node:20-alpine

WORKDIR /app

# Copia só os manifests primeiro — `npm ci` só depende deles, não do
# código-fonte. Mantém essa camada em cache entre builds que só mudam
# código (o caso comum em dev com hot reload via bind mount), evitando
# reinstalar tudo — e recriar uma imagem gigante — a cada rebuild.
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/config/package.json packages/config/
COPY packages/db/package.json packages/db/
COPY packages/shared-types/package.json packages/shared-types/

RUN npm ci

# Resto do monorepo — muda a cada alteração de código, mas não invalida
# a camada de npm ci acima.
COPY . .

EXPOSE 3333

CMD ["npm", "run", "dev", "-w", "api"]
