"""PetroPulse AI backend entrypoint."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import anomaly
from app.api.v1 import aips
from app.api.v1 import assets
from app.api.v1 import forecast
from app.api.v1 import health
from app.api.v1 import metrics
from app.api.v1 import shap
from app.api.v1 import simulation
from app.api.v1 import websocket
from app.core.config import settings
from app.core.database import SessionLocal, init_db
from app.data.sample_assets import SampleAssetGenerator
from app.utils.cache import init_redis
from app.utils.logger import setup_logger

logger = setup_logger("petropulse")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    # Initialize database
    init_db()
    logger.info("Database authenticated")
    
    # Initialize Redis if configured
    redis_client = init_redis()
    if redis_client:
        logger.info("Redis connection established")
    else:
        logger.info("Redis not configured or unavailable")
    
    # Seed database with sample data if enabled
    if settings.seed_on_startup:
        db = SessionLocal()
        try:
            result = SampleAssetGenerator.seed_database(db)
            logger.info(f"Database seeding: {result}")
        finally:
            db.close()
    
    yield
    
    # Cleanup
    logger.info("Application shutdown")


app = FastAPI(
    title=settings.app_name,
    version=settings.version,
    lifespan=lifespan,
    docs_url="/docs",
    openapi_url="/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API v1 routers
app.include_router(health.router, prefix=settings.api_v1_prefix)
app.include_router(assets.router, prefix=settings.api_v1_prefix)
app.include_router(forecast.router, prefix=settings.api_v1_prefix)
app.include_router(anomaly.router, prefix=settings.api_v1_prefix)
app.include_router(aips.router, prefix=settings.api_v1_prefix)
app.include_router(shap.router, prefix=settings.api_v1_prefix)
app.include_router(metrics.router, prefix=settings.api_v1_prefix)
app.include_router(simulation.router, prefix=settings.api_v1_prefix)
app.include_router(websocket.router)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host=settings.host, port=settings.port, reload=True)
