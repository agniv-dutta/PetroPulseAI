"""Test environment configuration — must run before any app import."""

import os
import tempfile

os.environ.setdefault("DATABASE_URL", f"sqlite:///{tempfile.gettempdir()}/pp_test.db")
os.environ.setdefault("WARM_CACHE_ON_STARTUP", "false")
