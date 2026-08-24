"""Test environment configuration — must run before any app import."""

import os
import tempfile
import uuid

# Unique per pytest invocation so committed fixtures never leak across runs.
_TEST_DB = os.path.join(
    tempfile.gettempdir(), f"pp_test_{uuid.uuid4().hex[:12]}.db"
)
os.environ.setdefault("DATABASE_URL", f"sqlite:///{_TEST_DB}")
os.environ.setdefault("WARM_CACHE_ON_STARTUP", "false")

import pytest


@pytest.fixture(scope="session", autouse=True)
def _database_schema():
    """Guarantee canonical schema + demo portfolio even without app-lifespan tests."""
    from sqlalchemy import func, select

    from app.core.database import Base, SessionLocal, engine
    from app.ingestion.seed import seed_database
    from app.models import Asset

    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        if not db.scalar(select(func.count()).select_from(Asset)):
            seed_database(db)
    yield


@pytest.fixture(scope="session")
def client():
    """Shared FastAPI TestClient (single app lifespan per test session)."""
    from fastapi.testclient import TestClient

    from app.main import app

    with TestClient(app) as c:
        yield c
