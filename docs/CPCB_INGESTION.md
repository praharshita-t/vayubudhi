# CPCB updates for the free preview

`Refresh station observations` runs hourly at minute 17 UTC and supports
manual dispatch. GitHub schedules can be delayed. GitHub-hosted Linux and macOS
runners could not connect to data.gov.in during setup, so the workflow triggers
an authenticated background refresh on the Render backend and polls its result.
The app may cold-start before processing a request.

## Credentials

- Render backend: `DATAGOV_API_KEY` for CPCB and `OPENAQ_API_KEY` for OpenAQ fallback.
- Render backend and GitHub Actions: the same independent random
  `INGESTION_TRIGGER_SECRET` of at least 32 characters.

The trigger credential can only start ingestion and inspect its run status. It
is not an account login, staff token, database credential or sensor key. Never
put it into the frontend or commit it. GitHub does not need the database or
provider secrets for this workflow; earlier direct-worker secrets may be removed
from GitHub after switching to the backend-trigger workflow.

## Operation

POST `/api/ingestion/scheduled-refresh` with `X-Ingestion-Key` returns a run ID.
GET `/api/ingestion/scheduled-refresh/{run_id}` with that header reports queued,
running, succeeded or failed. Results expire from Redis after 24 hours. The job
uses the existing PostgreSQL advisory lock, preventing overlap with other
workers/manual triggers. Request failures are retried and API-key query values
are redacted from diagnostics. Failed pages abort ingestion rather than silently
committing an incomplete feed. An empty CPCB feed is a failed refresh.

The 10,000-record cap accommodates the observed 4,025-record feed; monitor feed
growth, database storage and Actions results. Schema changes remain Alembic's
responsibility. The lightweight `cpcb_once` command is also available for hosts
that can reach CPCB directly, using `backend/requirements-ingestion.txt`.

Keep `INGESTION_ENABLED=false`: the production API rejects the development
in-process scheduler. These explicit background refreshes do not start an
always-on scheduler or paid worker. Check `/api/ingestion/status` for database
station counts and provider timestamps. This workflow does not publish a worker
heartbeat. Weather, traffic and AI providers remain separate integrations.

## OpenAQ fallback and data quality

The OpenAQ v3 parser joins latest readings to sensor metadata by `sensorsId`,
normalizes supported units and excludes unknown sensors or observations older
than 24 hours. Location metadata is filtered to the same freshness window and
up to 36 locations are selected round-robin across the app's cities, preferring
reference monitors. This bounds API usage while spreading coverage. Coverage is
not guaranteed for every city. Valid observations count as a successful refresh
even when their timestamp already exists; failures in CPCB do not hide a
successful OpenAQ update.

City responses preserve null measurements and real zero values. Weather failures
produce null fields rather than invented weather. At matching coordinates the
newer provider observation wins after normalizing CPCB timestamps from IST and
OpenAQ timestamps from UTC. The dashboard displays the latest actual station
observation time rather than the browser's current time.
