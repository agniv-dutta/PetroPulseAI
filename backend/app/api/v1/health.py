"""Health check API endpoint."""

from datetime import datetime, timezone

from fastapi import APIRouter
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import SessionLocal, engine
from app.models import HealthResponse
from app.utils.cache import get_redis

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
def health_check() -> HealthResponse:
    """Health check endpoint with actual database and Redis connectivity checks."""
    # Check database connectivity
    database_connected = False
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        database_connected = True
    except Exception as e:
        pass  # Database not connected

    # Check Redis connectivity
    redis_connected = False
    try:
        redis_client = get_redis()
        if redis_client:
            redis_client.ping()
            redis_connected = True
    except Exception as e:
        pass  # Redis not configured or not connected

    return HealthResponse(
        status="healthy" if database_connected else "unhealthy",
        service=settings.app_name,
        version=settings.version,
        database_connected=database_connected,
        redis_connected=redis_connected,
        timestamp=datetime.now(timezone.utc),
    )
