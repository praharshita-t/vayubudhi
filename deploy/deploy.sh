#!/usr/bin/env bash
# Run from an extracted release directory; host secrets live outside releases.
set -Eeuo pipefail
umask 077
release_dir="$(cd -- "$(dirname -- "$0")/.." && pwd)"
host_root="$(cd -- "$release_dir/../.." && pwd)"
exec 9>"$host_root/deploy.lock"
flock -n 9 || { echo 'Another deployment is running'; exit 1; }
test -s "$host_root/.env" || { echo "Missing $host_root/.env"; exit 1; }
cp "$host_root/.env" "$release_dir/.env"
printf '\nBACKEND_IMAGE=%s\nFRONTEND_IMAGE=%s\n' "${BACKEND_IMAGE:?Missing release backend image}" "${FRONTEND_IMAGE:?Missing release frontend image}" >> "$release_dir/.env"
chmod 600 "$release_dir/.env"
cd "$release_dir"
compose=(docker compose --env-file .env -f compose.production.yml)
"${compose[@]}" config --quiet
"${compose[@]}" pull
"${compose[@]}" up -d --wait --wait-timeout 120 db redis
mkdir -p "$host_root/backups"
# Take a database backup before every migration, including the first empty DB.
backup="$host_root/backups/pre-deploy-$(date -u +%Y%m%dT%H%M%SZ).dump"
# These variables must expand inside the database container, never on the host.
# shellcheck disable=SC2016
"${compose[@]}" exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$backup"
test -s "$backup"
"${compose[@]}" run --rm --no-deps migrate
# Migrations ran exactly once above; don't recreate the migration dependency.
"${compose[@]}" up -d --no-deps --wait --wait-timeout 180 backend frontend ingestion
"${compose[@]}" up -d --no-deps proxy
"${compose[@]}" exec -T backend python -c 'import urllib.request; urllib.request.urlopen("http://frontend:3000/", timeout=30)'
"${compose[@]}" exec -T backend python -c 'import urllib.request; urllib.request.urlopen("http://frontend:3000/api/health", timeout=30)'
previous="$(readlink "$host_root/current" || true)"
if [[ -n "$previous" && "$previous" != "$release_dir" ]]; then
    ln -sfn "$previous" "$host_root/previous"
fi
ln -sfn "$release_dir" "$host_root/current"
echo 'Deployment is healthy. Database backup retained on the host.'
