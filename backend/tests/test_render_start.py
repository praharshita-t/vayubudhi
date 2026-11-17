import subprocess
import sys
from unittest.mock import patch

import pytest

from app.render_start import main


def test_failed_migration_does_not_start_api():
    with patch("app.render_start.subprocess.run", side_effect=subprocess.CalledProcessError(1, "alembic")), patch("app.render_start.os.execvp") as start:
        with pytest.raises(subprocess.CalledProcessError):
            main()
        start.assert_not_called()


def test_migration_finishes_before_api_starts(monkeypatch):
    monkeypatch.setenv("PORT", "12345")
    events = []
    with patch("app.render_start.subprocess.run", side_effect=lambda *a, **kw: events.append("migration")), patch("app.render_start.os.execvp", side_effect=lambda *a: events.append(a)):
        main()
    assert events[0] == "migration"
    executable, args = events[1]
    assert executable == sys.executable
    assert args[args.index("--port") + 1] == "12345"
    assert args[args.index("--workers") + 1] == "1"
