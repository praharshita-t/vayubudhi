"""Environment configuration shared by the API, migrations and worker."""
import os

PRODUCTION = os.getenv("APP_ENV", "development") == "production"
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "development-only-change-before-deploying")
if PRODUCTION:
    if len(JWT_SECRET_KEY) < 32 or JWT_SECRET_KEY.startswith(("development-", "vayubudhi")):
        raise RuntimeError("Production requires a random JWT_SECRET_KEY of at least 32 characters")
    if not os.getenv("DATABASE_URL", "").startswith(("postgresql://", "postgresql+psycopg2://")):
        raise RuntimeError("Production requires a PostgreSQL DATABASE_URL")
    if not os.getenv("REDIS_URL"):
        raise RuntimeError("Production requires REDIS_URL")
    origins = [value.strip() for value in os.getenv("ALLOWED_ORIGINS", "").split(",") if value.strip()]
    if not origins or any(not value.startswith("https://") or "*" in value for value in origins):
        raise RuntimeError("Production requires explicit HTTPS ALLOWED_ORIGINS")
    if os.getenv("SEED_DEMO_USERS", "false").lower() == "true":
        raise RuntimeError("Demo accounts are forbidden in production")
