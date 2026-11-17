# Deployment runbook

This release supports one Linux x86-64 Docker host per environment. It runs
Next.js, FastAPI (including ML and advisory assets), PostgreSQL 16, Redis, one
ingestion worker, and Caddy. Only Caddy exposes public ports. No cloud resources
are created by this repository. Hosting and domains are separate setup tasks.

## Release preparation

Work on a feature branch and open a pull request. Do not push directly to main.
Configure a GitHub ruleset requiring a pull request and the `frontend` and
`backend` CI checks; prohibit force pushes and branch deletion. These settings
must be configured in GitHub; committing YAML does not enforce branch protection.

`CI` validates the frontend build and dependency audit, API/security/model tests,
PostgreSQL migrations and schema drift, and both production container builds.
`Release and deploy` is manual and accepts only a full commit SHA reachable from
main. Staging publishes images to GHCR and records their immutable digests only
after public smoke checks pass. Production downloads those digests from a
successful staging run, rather than rebuilding the images. Staging artifacts
expire after 30 days; rerun staging when promotion is needed later.

## Local verification

Install Docker Engine/Desktop with Compose v2. Use a disposable database for all
tests; the older tests in `backend/app/test_*.py` reset tables or seed demo users
and must never be pointed at production. Release tests live in `backend/tests`.

```sh
docker compose up --build -d
# Local frontend: http://localhost:3000; API: http://localhost:8000
```

This development stack binds ports to loopback and uses development credentials.
It never creates demo accounts unless explicitly requested. To exercise staff
features, provision an account interactively:

```sh
docker compose run --rm backend python -m app.bootstrap_admin --role city_officer
```

For a native Linux backend environment, use Python 3.12 and the locked
requirements. On Windows, use Docker: the release lock uses CPU-only Linux
XGBoost. XGBoost and scikit-learn match the serialized artifact versions.

Regenerate `backend/requirements.txt` from `backend/requirements.in` using
`pip-compile` in Linux/Python 3.12, then rerun model tests and the dependency audit.

```sh
python -m pip install -r backend/requirements.txt -r backend/requirements-test.txt
cd backend
# Set DATABASE_URL to a DISPOSABLE PostgreSQL database; set REDIS_URL.
alembic upgrade head
alembic check
python -m pytest tests -q
```

The backend Dockerfile also has a `test` target that includes the release tests.
Set production environment variables, migrate the disposable database, then run
that target on the same Docker network to test the actual Linux runtime.

## Host setup (later, before first deployment)

1. Provision separate staging and production hosts, or isolate them using
   different Compose project names, domains, and published ports.
2. Install Docker Engine and Compose v2; install `bash`, `flock`, `tar`, and `curl`.
3. Create a deploy user and provision its SSH public key. Docker group access is
   effectively root access; restrict this account and its authorized keys.
4. Create `/opt/vayubudhi-staging/releases` and
   `/opt/vayubudhi-production/releases`, owned by the deploy user, mode 700.
5. Copy `.env.example` to `/opt/vayubudhi-ENV/.env`, mode 600. Generate independent
   random database/JWT/sensor secrets. Use a hexadecimal database password so its
   value can safely appear in `DATABASE_URL`; keep both password fields identical.
6. Set `DOMAIN`, HTTPS `ALLOWED_ORIGINS`, and a unique `COMPOSE_PROJECT_NAME` per
   environment. Leave image placeholders in the host template: the workflow
   supplies digest-pinned images in each release's private `.env` copy.
7. Configure at least `DATAGOV_API_KEY` or `OPENAQ_API_KEY` for ingestion. Gemini
   and TomTom are optional: their absence must not be described as a verified live
   integration. `GEMINI_MODEL` is configurable; verify account/model access in
   staging. Do not put provider secrets in any `NEXT_PUBLIC_*` variable.
8. Point domain DNS to the host, allow inbound 80/443 and restricted SSH, and keep
   database/Redis/API/frontend container ports private. Caddy obtains HTTPS
   certificates and renews them using its persistent data volume.
9. Authenticate the host to GHCR with a read-only package token using
   `docker login ghcr.io --password-stdin`, or explicitly make release packages
   public. The Actions token used for publishing does not authenticate the host.

The frontend uses same-origin `/api` requests. Caddy routes those to FastAPI.
The Next.js standalone image includes a build-time rewrite to `http://backend:8000`
so direct frontend checks also reach the API. Rebuilding is required if that
internal address changes. Browser code contains no localhost API URL.

## GitHub configuration (later)

Create `staging` and `production` environments. Restrict both to main, require
reviewers for production, and configure the following independently:

| Kind | Name | Value |
| --- | --- | --- |
| Secret | `DEPLOY_HOST` | Server hostname or IPv4 address |
| Secret | `DEPLOY_USER` | Deploy SSH username |
| Secret | `DEPLOY_SSH_KEY` | Dedicated private deploy key |
| Secret | `DEPLOY_KNOWN_HOSTS` | SSH host key entry verified out of band |
| Variable | `DEPLOY_URL` | Public HTTPS URL without a trailing slash |

Allow the workflow to publish GHCR packages. Runtime provider/database/JWT secrets
stay on the host, outside the checkout and release archive. GitHub environment
records reflect deployment status after workflows are pushed and executed.

Run staging from main with the reviewed full SHA. The script pulls images,
starts database/cache, takes a pre-migration `pg_dump`, migrates once, waits for
API/frontend/worker health, starts the edge proxy, and checks internal routing.
The workflow then checks public HTTPS. Confirm fresh station observations and
exercise forecast, attribution, advisory, staff login, routing, and optional
integrations. Only then dispatch production with the same SHA.

## Database and recovery

Alembic is the single schema authority. PostgreSQL 16 is the supported database.
The previous Timescale init SQL was incompatible with the ORM (including IDs
and timestamp types) and is retired. Timescale hypertables, compression and
rollups require a separate reviewed schema migration; they are not enabled by
this deployment. Do not reuse an existing Timescale volume without a migration
plan and backup.

The deployment script saves a custom-format backup before every migration.
Schedule additional backups on the host, for example with a protected cron entry:

```sh
bash /opt/vayubudhi-production/current/deploy/backup.sh /opt/vayubudhi-production
```

Copy backups to encrypted off-host storage and define retention there. A local
Docker volume or a backup on the same host does not cover host loss. Before going
live, restore a backup into a separate database using `pg_restore`, verify row
counts, and test the application against it. Never restore over the live database
without an explicit recovery decision.

For a schema-compatible application rollback:

```sh
bash /opt/vayubudhi-production/current/deploy/rollback.sh /opt/vayubudhi-production
```

This switches to the previous release and preserves the database schema. It does
not run Alembic downgrades or restore data automatically. A failed deployment
leaves logs and its pre-migration backup available for diagnosis. First releases
have no previous version to roll back to. Use backward-compatible migrations and
review schema compatibility before invoking rollback. This single-host setup can
briefly interrupt requests during a release; it does not promise zero downtime.

If a deployment failed before it updated `current`, restore the last successful
release with `rollback.sh /opt/vayubudhi-production current`. The default
`previous` target is for rolling back an already successful release.

## Operations and product limits

Monitor `/api/health` externally: production readiness requires database, Redis,
and packaged model availability. Invalid model artifacts fail startup after an
actual inference check. Inference errors return 503 rather than silently showing
physics fallback predictions as model results. `/api/ingestion/status` reports
database observation freshness, the worker heartbeat, and its last result. Alert
on stale observations as well as HTTP failures. Container logs are rotated for
the public application services. No arbitrary region or legal compliance claim
is inferred from an environment variable or response header.

Public registration cannot assign roles. Provision staff on the host with the
interactive command above; the `--role` options are `super_admin`, `city_officer`,
and `field_inspector`. Public data/forecast/advisory exploration remains available.
Routing and dispatch operations require a staff JWT. Production has no seeded
demo staff accounts or one-click role switching. Sensor POSTs require `X-API-Key`
matching `SENSOR_API_KEY`; firmware must be configured with the production HTTPS
endpoint, trusted CA certificate and key before physical-device rollout.

The old repository included a frontend Mapbox token. It was removed from this
release; rotate/revoke it in its provider account because Git history still
contains it. Map rendering now uses MapLibre and does not need that token.

Some existing analytical features use simulated data or heuristic evidence (for
example PINN mocks and generated source evidence). Packaging and deployment
checks do not validate scientific accuracy, provider availability, or regulatory
compliance. Keep those product claims separate from infrastructure readiness.

## References

- [Next.js self-hosting and reverse proxies](https://nextjs.org/docs/app/guides/self-hosting)
- [Docker Compose startup dependencies](https://docs.docker.com/compose/how-tos/startup-order/)
- [GitHub Actions container publishing](https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images)
- [Google GenAI SDK migration](https://ai.google.dev/gemini-api/docs/migrate)
