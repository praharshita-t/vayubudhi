"""
Database configuration and session management for VayuBudhi.
Supports dual-mode execution:
1. Enterprise Cloud TimescaleDB / PostgreSQL with connection pooling (pool_size=20, max_overflow=40).
2. Local Development SQLite with Write-Ahead Logging (WAL) and non-blocking concurrency.
Provides both Synchronous and Asynchronous (SQLAlchemy 2.0 AsyncSession) interfaces.
"""
import os
import ssl
from pathlib import Path
from dotenv import load_dotenv
from typing import AsyncGenerator, Generator
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.engine import make_url

# Neon CLI writes repo-root .env.local. Explicit host/container environment
# variables retain priority, and credentials never enter source control.
project_root = Path(__file__).resolve().parents[2]
load_dotenv(project_root / ".env.local", override=False)
load_dotenv(project_root / ".env", override=False)


def async_postgres_connection(url: str) -> tuple[str, dict]:
    """Translate managed Postgres/libpq TLS options for the asyncpg driver."""
    parsed = make_url(url).set(drivername="postgresql+asyncpg")
    query = dict(parsed.query)
    # This libpq-only option is not an asyncpg connection keyword. TLS below
    # verifies the server certificate and hostname for managed connections.
    query.pop("channel_binding", None)
    mode = query.pop("sslmode", None)
    connect_args = {}
    if mode in {"require", "verify-ca", "verify-full"}:
        connect_args["ssl"] = ssl.create_default_context()
    elif mode == "disable":
        connect_args["ssl"] = False
    elif mode in {"allow", "prefer"}:
        connect_args["ssl"] = mode
    elif mode is not None:
        raise ValueError("Unsupported PostgreSQL sslmode")
    return parsed.set(query=query).render_as_string(hide_password=False), connect_args

# Base database URL from environment
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./vayubudhi.db")

# Normalize legacy postgres:// to postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# SQLAlchemy 2.1 defaults to psycopg3; this project explicitly installs psycopg2.
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

is_sqlite = DATABASE_URL.startswith("sqlite")

# ==========================================================
# 1. Synchronous Engine & Session Factory
# ==========================================================
if is_sqlite:
    # High-concurrency SQLite engine with multi-threading support
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False}
    )

    # Enable Write-Ahead Logging (WAL) and synchronous normal for robust concurrency
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.close()
else:
    # Enterprise-grade PostgreSQL / TimescaleDB engine with connection pooling
    engine = create_engine(
        DATABASE_URL,
        pool_size=20,
        max_overflow=40,
        pool_timeout=30,
        pool_pre_ping=True,
        pool_recycle=1800
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# ==========================================================
# 2. Asynchronous Engine & Session Factory (SQLAlchemy 2.0)
# ==========================================================
if is_sqlite:
    if DATABASE_URL.startswith("sqlite:///"):
        ASYNC_DATABASE_URL = DATABASE_URL.replace("sqlite:///", "sqlite+aiosqlite:///", 1)
    else:
        ASYNC_DATABASE_URL = "sqlite+aiosqlite:///./vayubudhi.db"

    async_engine = create_async_engine(
        ASYNC_DATABASE_URL,
        connect_args={"check_same_thread": False}
    )
else:
    ASYNC_DATABASE_URL, async_connect_args = async_postgres_connection(DATABASE_URL)

    async_engine = create_async_engine(
        ASYNC_DATABASE_URL,
        connect_args=async_connect_args,
        pool_size=20,
        max_overflow=40,
        pool_timeout=30,
        pool_pre_ping=True,
        pool_recycle=1800
    )

AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False
)


# ==========================================================
# 3. Session Dependency Generators
# ==========================================================
def get_db() -> Generator:
    """
    Synchronous dependency yielding database sessions.
    Used across standard FastAPI routes and background ingestion workers.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


async def get_async_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Asynchronous dependency yielding AsyncSession.
    Enables non-blocking high-throughput async endpoints.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
