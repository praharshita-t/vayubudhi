# Free Render preview with Neon

This is a limited public preview, not the always-on production setup described
in DEPLOYMENT.md. The deployment uses the reviewed main branch and Render's
After CI Checks Pass trigger.

## Resources

- Render project: VayuBudhi; environment: Preview; region: Singapore.
- Backend: `backend/Dockerfile`, repository-root build context, Free plan.
- Frontend: `frontend/Dockerfile`, `frontend` build context/root, Free plan.
- Render Key Value: Free plan, same region, external traffic blocked.
- Neon PostgreSQL: separate Free project, linked locally using `neon init`.

Render rejected a second Free Postgres instance in the workspace. Existing
projects and their databases were not modified. Neon supplies the preview's
database instead. Credentials are stored in ignored local environment files and
the backend's private Render environment, never in this document or Git.

## Backend settings

Configure `APP_ENV=production`, `DATABASE_URL` from Neon's direct/unpooled
connection string, the private Render `REDIS_URL`, independent random
`JWT_SECRET_KEY` and `SENSOR_API_KEY`, and the frontend's HTTPS `ALLOWED_ORIGINS`.
Keep `SEED_DEMO_USERS=false` and `INGESTION_ENABLED=false`.

Use a single process and limit numerical-library threads to one with
`OPENBLAS_NUM_THREADS`, `OMP_NUM_THREADS`, `MKL_NUM_THREADS` and
`NUMEXPR_MAX_THREADS`. The measured unbounded startup peak was about 453 MiB;
the Free instance has only 512 MiB, so heavy diagnostics and concurrent requests
can exhaust memory. Do not represent this as a capacity-tested production plan.

Free services do not support pre-deploy commands. The backend's Docker Command is:

```sh
/bin/sh -c 'alembic upgrade head && exec uvicorn app.main:app --host 0.0.0.0 --port 10000 --workers 1 --no-proxy-headers'
```

Set its health check to `/api/health`. Neon's libpq-style `sslmode` and
`channel_binding` parameters are translated for asyncpg; managed async
connections verify the server certificate and hostname.

## Frontend settings

Set `BACKEND_URL` to the backend's actual public HTTPS URL before the Docker
build. Render forwards this variable to the existing Docker build argument.
This bakes the same-origin `/api` rewrite into the standalone Next.js image.
Free Render backends cannot receive private-network requests, so the frontend
uses the backend's public HTTPS endpoint. Do not put database/JWT/provider
secrets in frontend environment variables.

After Render assigns the frontend URL, update the backend's `ALLOWED_ORIGINS`
to that exact HTTPS origin. A custom domain is optional; provider subdomains
can be used for the preview.

## Limits and remaining work

Free web services sleep after inactivity and share the workspace's monthly
instance-hour allowance. Existing projects also consume that allowance. Free
cache data is ephemeral. There is no paid background worker, scheduled ingestion,
production availability guarantee, or production backup/recovery guarantee in
this preview. Data-provider credentials and staff provisioning must be configured
separately before claiming the corresponding integrations work.

The repository-wide branch rules and GitHub deployment environments still need
a repository administrator. A collaborator with push access can deploy the
public repository through Render without being its owner.

## References

- https://render.com/docs/free
- https://render.com/docs/docker
- https://render.com/docs/deploys
- https://neon.com/get-started/prompt.md
