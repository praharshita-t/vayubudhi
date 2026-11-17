# ==========================================================
# VayuBudhi API Backend - Multi-Stage Production Dockerfile
# ==========================================================

# Stage 1: Builder Stage
FROM python:3.15-slim AS builder

WORKDIR /build

# Install build-time dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies into a virtual environment
COPY backend/requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip python -m venv /opt/venv && \
    /opt/venv/bin/pip install --upgrade pip setuptools wheel && \
    /opt/venv/bin/pip install -r requirements.txt


# Stage 2: Production Runtime Stage
FROM python:3.15-slim AS runner

WORKDIR /app/backend

# Install runtime libraries only (e.g. libpq for PostgreSQL/TimescaleDB, curl for healthchecks)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy pre-built virtual environment from builder stage
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Create unprivileged non-root user for enterprise security
RUN groupadd -g 10001 vayugroup && \
    useradd -u 10001 -g vayugroup -s /bin/bash -m appuser

# Copy application code and database migrations
COPY backend/app/ ./app/
COPY backend/alembic/ ./alembic/
COPY backend/alembic.ini .
COPY ml_model/src/ /app/ml_model/src/
COPY ml_model/data/ /app/ml_model/data/
COPY data/ /app/data/
COPY agent_advisor/src/ /app/agent_advisor/src/

# Set correct ownership
RUN chown -R appuser:vayugroup /app

# Switch to non-root user
USER appuser

# Expose internal API port
EXPOSE 8000

# Health check to ensure zero-downtime rolling updates
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -fsS http://localhost:8000/api/health || exit 1

# Launch ASGI production server with 4 worker processes
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1", "--no-proxy-headers"]

FROM runner AS test
USER root
COPY backend/requirements-test.txt /tmp/requirements-test.txt
RUN pip install --no-cache-dir -r /tmp/requirements-test.txt
COPY --chown=appuser:vayugroup backend/tests/ ./tests/
USER appuser
CMD ["python", "-m", "pytest", "tests", "-q"]

FROM runner AS production
