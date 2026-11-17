# Deployment preparation status — 17 November 2026

Code preparation is complete on `fix/production-readiness`, based on main
`302c6dc`. Changes are prepared for review through a pull request into main.
No production deployment or merge was performed during preparation.

## Verified locally

| Check | Result |
| --- | --- |
| Frontend production build and TypeScript | Passed, including Docker standalone image |
| Backend production and test images | Built on Linux/Python 3.12 |
| Release API/security/ML/worker tests | 17 passed against disposable PostgreSQL and Redis |
| PostgreSQL migration | Fresh upgrade succeeded; Alembic reports no schema drift |
| Backend dependency consistency | `pip check` passed |
| Dependency vulnerability scans | npm and pip-audit reported no known vulnerabilities in the audited production dependency sets |
| Model compatibility | CPU XGBoost 3.3.0 and scikit-learn 1.9.0 match the saved artifacts; real inference succeeds |
| Local container stack | API, frontend, PostgreSQL, Redis and proxy started successfully |
| Proxy/API integration | `/api/health` returned 200 with database, Redis and models ready; Next.js API rewrite returned 200 |
| Browser smoke check | Dashboard loaded; guest enforcement gate and staff sign-in form worked; no captured browser errors |
| Workflow validation | actionlint passed |
| Release/recovery scripts | Bash syntax and shellcheck passed |
| Caddy configuration | Validation passed |
| Backup/restore | `pg_dump` restored into a separate disposable database, including migration revision and telemetry rows |

The dashboard now shows loading/unavailable states when station data is missing
instead of displaying a zero AQI as clean air. The final frontend image includes
this change and passes its production build.

## Prepared changes

- Same-origin frontend API requests and internal proxy routing.
- Packaged model files, datasets, inference source and advisor code.
- Locked Linux dependencies, patched frontend dependencies, current Gemini SDK
  and a configurable model.
- Private PostgreSQL/Redis services and one ingestion process with PostgreSQL
  advisory locking, heartbeat and shared status.
- Explicit migrations, real readiness checks, secret validation and rotated logs.
- Public registration cannot choose staff roles. No production demo seeding or
  one-click staff access. Routing/dispatch require staff authentication, and
  sensor ingestion requires an API key.
- Interactive staff provisioning, pre-migration backups and application rollback.
- CI and manual staging/production workflows. Production promotes verified image
  digests from a successful staging workflow rather than rebuilding.
- Retired conflicting Timescale initialization SQL and unsupported automatic
  model retraining in production.

## Intentionally left for the deployment phase

No hosting, domain or SSH access currently exists. Those must be selected and
configured together with GitHub environments, branch protection, package access,
runtime secrets, provider keys, HTTPS/DNS, off-host backup storage and monitoring.
The workflows are written and linted; they have not run on GitHub yet.

Live provider ingestion and Gemini requests were not verified with real account
credentials. Worker lifecycle and locking were tested without issuing provider
requests. Public HTTPS certificates, remote SSH deployment, real-host recovery,
physical sensor firmware and scientific/model accuracy require staging or a
separate product validation step. Some existing analytics still contain heuristic
or simulated evidence; deployment preparation does not certify those claims.

The previously committed Mapbox token was removed from current files but must be
revoked or rotated in its provider account because it remains in Git history.

Use [the deployment runbook](DEPLOYMENT.md) when starting the next phase.
