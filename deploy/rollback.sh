#!/usr/bin/env bash
# Application rollback only. Database downgrade/restore is deliberately separate.
set -Eeuo pipefail
umask 077
root="${1:?Usage: rollback.sh /opt/vayubudhi-production [previous|current]}"
target="${2:-previous}"
[[ "$target" == previous || "$target" == current ]] || exit 1
exec 9>"$root/deploy.lock"
flock -n 9 || { echo 'Another deployment is running'; exit 1; }
previous="$(readlink "$root/$target")"
current="$(readlink "$root/current")"
test -n "$previous" && test -f "$previous/.env"
cd "$previous"
docker compose --env-file .env -f compose.production.yml up -d --no-deps --wait --wait-timeout 180 backend frontend ingestion
docker compose --env-file .env -f compose.production.yml up -d --no-deps proxy
ln -sfn "$previous" "$root/current"
if [[ "$previous" != "$current" ]]; then
    ln -sfn "$current" "$root/previous"
fi
echo 'Previous application release restored; database schema was preserved.'
