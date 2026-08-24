from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "PetroPulse AI Backend"
    version: str = "1.0.0"
    debug: bool = True
    api_v1_prefix: str = "/api/v1"

    host: str = "0.0.0.0"
    port: int = 8000

    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://localhost:4173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]

    database_url: str = f"sqlite:///{BACKEND_DIR / 'petropulse.db'}"

    redis_url: str = ""
    celery_broker_url: str = ""
    celery_result_backend: str = ""

    seed_on_startup: bool = True
    warm_cache_on_startup: bool = True
    seed_history_months: int = 36
    seed_random_seed: int = 42

    simulation_tick_seconds: float = 2.0
    simulation_max_sessions: int = 16
    simulation_duration_default_ticks: int = 600

    # Decision-intelligence configuration (backend is the single source of truth)
    aips_priority_thresholds: dict[str, float] = {
        "CRITICAL": 80.0,
        "HIGH": 60.0,
        "MEDIUM": 40.0,
    }
    # Raw weighted AIPS sum at which the presented score equals 100.
    # 27.72 / 30 x 100 ~= 92 reproduces the approved MH-07 reference scenario.
    aips_scale_reference: float = 30.0
    recovery_historical_rate: float = 0.80


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
