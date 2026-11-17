import ssl
from app.database import async_postgres_connection


def test_managed_postgres_parameters_use_verified_async_tls():
    url, args = async_postgres_connection(
        "postgresql://test:example@db.example.com/test?sslmode=require&channel_binding=require"
    )
    assert url.startswith("postgresql+asyncpg://")
    assert "sslmode" not in url and "channel_binding" not in url
    assert args["ssl"].verify_mode == ssl.CERT_REQUIRED
    assert args["ssl"].check_hostname is True


def test_local_postgres_does_not_force_tls():
    _, args = async_postgres_connection("postgresql://test:example@localhost/test")
    assert args == {}
