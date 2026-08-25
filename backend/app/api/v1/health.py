"""Health endpoint (spec: GET /api/v1/health).

Reports database and (optional) Redis connectivity. Redis is an optional
accelerator - the platform degrades gracefully without it, so an absent
Redis never turns the service "unhealthy".
"""

from datetime import datetime, timezone

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.core.config import settings
from app.core.database import engine
from app.schemas.health import HealthResponse

router = APIRouter(tags=["system"])


def _check_database() -> bool:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False


def _check_redis() -> bool:
    try:
        import redis  # type: ignore[import-untyped]

        client = redis.Redis.from_url(
            settings.redis_url,
            socket_connect_timeout=0.5,
            socket_timeout=0.5,
        )
        return bool(client.ping())
    except Exception:
        return False


@router.get("/health", response_model=HealthResponse)
def health() -> JSONResponse:
    db_ok = _check_database()
    redis_ok = _check_redis()

    payload = HealthResponse(
        status="healthy" if db_ok else "unhealthy",
        service=settings.app_name,
        version=settings.version,
        database_connected=db_ok,
        redis_connected=redis_ok,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )
    return JSONResponse(
        status_code=200 if db_ok else 503,
        content=payload.model_dump(),
    )
