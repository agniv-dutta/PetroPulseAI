from functools import lru_cache
from typing import Dict, List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application
    app_name: str = "PetroPulse AI"
    version: str = "1.0.0"
    debug: bool = False

    # API prefix (both spellings supported; main.py uses api_v1_prefix)
    api_prefix: str = "/api/v1"
    api_v1_prefix: str = "/api/v1"

    # Server
    host: str = "0.0.0.0"
    port: int = 8000

    # CORS
    cors_origins: List[str] = [
        "http://localhost:5173",
        "http://localhost:4173",
        "http://localhost:3000",
    ]

    # Database (SQLite by default so the demo runs with zero infrastructure;
    # switch to postgresql+asyncpg://... for production deployments)
    database_url: str = Field(
        default="sqlite:///./petropulse.db",
        description="SQLAlchemy database URL (sqlite or postgresql+asyncpg)",
    )

    # Redis (optional caching layer; the app degrades gracefully without it)
    redis_url: str = "redis://localhost:6379/0"
    redis_enabled: bool = False

    # Celery
    celery_broker_url: str = "redis://localhost:6379/0"
    celery_result_backend: str = "redis://localhost:6379/0"

    # Seeding
    seed_history_months: int = 36
    seed_random_seed: int = 42

    # Startup behaviour
    warm_cache_on_startup: bool = True

    # Simulation defaults
    simulation_tick_seconds: float = 0.05
    simulation_max_sessions: int = 8
    simulation_duration_default_ticks: int = 120

    # AIPS configuration (approved formula constants)
    aips_scale_reference: float = 30.0
    aips_priority_thresholds: Dict[str, float] = Field(
        default_factory=lambda: {"CRITICAL": 80.0, "HIGH": 60.0, "MEDIUM": 40.0}
    )

    # Recovery estimation (approved historical intervention success rate)
    recovery_historical_rate: float = 0.80

    # ML model artefacts (optional persistence locations)
    model_cache_dir: str = "./models"

    # Security
    secret_key: str = "change-in-production"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
