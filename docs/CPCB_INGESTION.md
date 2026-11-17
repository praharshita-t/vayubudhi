# CPCB updates for the free preview

The `Refresh CPCB station observations` GitHub Actions workflow runs hourly at
minute 17 UTC and can also be dispatched manually. Scheduled Actions can be
delayed, so this is periodic ingestion rather than a real-time availability
guarantee. It continues independently of sleeping Render web services.

Repository Actions secrets:

- `DATAGOV_API_KEY`: the account's personal data.gov.in API key.
- `INGESTION_DATABASE_URL`: the app's direct Neon PostgreSQL connection string.

Do not store these in workflow YAML, logs, or frontend variables. GitHub-hosted
runners use them to request CPCB observations and write them into the migrated
app database. API JWT and sensor secrets are not needed by this job. The existing
Render backend key may remain configured for authenticated manual ingestion.

The job uses a lightweight dependency lock, does not load ML models or create
tables, and shares the PostgreSQL advisory lock with the API's manual ingestion.
An empty feed or database ingestion error fails the job. Repeated observations
are updated rather than duplicated for the same station and timestamp. The
10,000-record cap currently accommodates the observed 4,025-record feed; monitor
provider growth, database storage, and the Actions run results.

Keep Render `INGESTION_ENABLED=false`: production API startup explicitly rejects
the in-process development scheduler. No paid Render worker is required for this
workflow. Check `/api/ingestion/status` for station and observation counts and
the latest provider timestamp. The Redis worker heartbeat is not used by this
GitHub-hosted scheduled job.

Before claiming a live dashboard, verify returned pollutant values and timestamps
for the requested city, not just a successful provider response. Open-Meteo weather
and optional traffic/AI integrations have independent availability and keys.
