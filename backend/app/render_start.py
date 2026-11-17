"""Run migrations before starting the single-process Render preview API."""

import os
import subprocess
import sys


def main() -> None:
    subprocess.run([sys.executable, "-m", "alembic", "upgrade", "head"], check=True)
    os.execvp(sys.executable, [
        sys.executable, "-m", "uvicorn", "app.main:app",
        "--host", "0.0.0.0", "--port", os.environ.get("PORT", "10000"),
        "--workers", "1", "--no-proxy-headers",
    ])


if __name__ == "__main__":
    main()
