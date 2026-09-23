# ==========================================================
# VayuBudhi API Backend - Multi-Stage Production Dockerfile
# ==========================================================

# Stage 1: Builder Stage
FROM python:3.11-slim AS builder

WORKDIR /build

# Install build-time dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies into a virtual environment
COPY requirements.txt .
RUN python -m venv /opt/venv && \
    /opt/venv/bin/pip install --upgrade pip setuptools wheel && \
    /opt/venv/bin/pip install --no-cache-dir -r requirements.txt


# Stage 2: Production Runtime Stage
FROM python:3.11-slim AS runner

WORKDIR /app

# Install runtime libraries only (e.g. libpq for PostgreSQL/TimescaleDB, curl for healthchecks)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
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
COPY app/ ./app/
COPY alembic/ ./alembic/
COPY alembic.ini .

# Set correct ownership
RUN chown -R appuser:vayugroup /app

# Switch to non-root user
USER appuser

# Expose internal API port
EXPOSE 8000

# Health check to ensure zero-downtime rolling updates
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:8000/ || exit 1

# Launch ASGI production server with 4 worker processes
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
