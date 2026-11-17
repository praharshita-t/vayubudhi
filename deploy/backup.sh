#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
root="${1:?Usage: backup.sh /opt/vayubudhi}"
cd "$root/current"
mkdir -p "$root/backups"
backup="$root/backups/scheduled-$(date -u +%Y%m%dT%H%M%SZ).dump"
docker compose --env-file .env -f compose.production.yml exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$backup"
test -s "$backup"
echo "Backup saved: $backup"
