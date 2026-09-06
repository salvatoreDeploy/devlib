#!/usr/bin/env bash
# Limpeza de Docker restrita ao devlib — rodar depois de terminar um ciclo
# de build/teste via `docker compose up --build`, pra não acumular imagens
# órfãs de rebuilds sucessivos.
#
# Só para/remove `api`/`web` — `postgres` fica rodando (evita reiniciar o
# banco e perder a conexão só por causa da limpeza; ele já não muda com
# rebuilds de api/web, não faz parte do problema que este script resolve).
#
# NUNCA remove volumes (`devlib_pgdata` guarda o Postgres local de dev —
# rodar `docker volume prune` logo depois de um `compose down` marcaria
# esse volume como "não usado" e apagaria o banco). Também não roda
# `docker builder prune`/`docker system prune`: o cache do BuildKit é
# compartilhado por todos os projetos do host, não só o devlib — ver
# docs/DECISIONS.md ("`.dockerignore` novo + `npm ci` cacheado...") pra
# rodar isso manualmente quando fizer sentido, sabendo que afeta outros
# projetos no mesmo host.

set -euo pipefail
cd "$(dirname "$0")/.."

echo "Parando e removendo containers de api/web (mantém postgres rodando e os volumes)..."
docker compose stop api web
docker compose rm -f api web

echo "Removendo imagens dangling (sem tag, de rebuilds anteriores)..."
docker image prune -f

echo "Feito. Postgres continua rodando; volumes preservados. Para liberar o cache de build (afeta outros projetos do host), rode manualmente: docker builder prune -f"
