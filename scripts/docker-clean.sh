#!/usr/bin/env bash
# Limpeza de Docker restrita ao devlib — rodar depois de terminar um ciclo
# de build/teste via `docker compose up --build`, pra não acumular imagens
# órfãs de rebuilds sucessivos.
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

echo "Parando e removendo containers/rede do devlib (mantém volumes)..."
docker compose down

echo "Removendo imagens dangling (sem tag, de rebuilds anteriores)..."
docker image prune -f

echo "Feito. Volumes preservados; para liberar o cache de build (afeta outros projetos do host), rode manualmente: docker builder prune -f"
