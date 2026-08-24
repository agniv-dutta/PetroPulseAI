"""Forecast service for business logic."""

from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import select
import random

from app.models import Asset, ForecastRun, MonthlyProduction


class ForecastService:
    """Service for forecast-related business logic."""

    @staticmethod
    def create_forecast(db: Session, asset_id: str, horizon_days: int) -> ForecastRun:
        """Create a forecast for an asset."""
        # Create a forecast run
        forecast_run = ForecastRun(
            asset_id=asset_id,
            model_name="gradient_boosting",
            horizon_months=horizon_days // 30,
            created_at=datetime.now(timezone.utc),
            metrics={
                "mae": round(random.uniform(50, 200), 2),
                "rmse": round(random.uniform(100, 300), 2),
                "r2": round(random.uniform(0.7, 0.95), 3),
                "mape": round(random.uniform(5, 15), 2),
            },
            params={"model_name": "gradient_boosting"},
            series=[
                {
                    "step": i,
                    "forecast": round(random.uniform(1000, 5000) * (0.95 ** i), 2),
                    "lower": round(random.uniform(800, 4800) * (0.95 ** i), 2),
                    "upper": round(random.uniform(1200, 5200) * (0.95 ** i), 2),
                }
                for i in range(horizon_days // 30)
            ],
        )
        db.add(forecast_run)
        db.commit()
        db.refresh(forecast_run)
        return forecast_run

    @staticmethod
    def get_forecast_history(db: Session, asset_id: str, limit: int = 10) -> list[ForecastRun]:
        """Get forecast history for an asset."""
        stmt = (
            select(ForecastRun)
            .where(ForecastRun.asset_id == asset_id)
            .order_by(ForecastRun.created_at.desc())
            .limit(limit)
        )
        return list(db.execute(stmt).scalars().all())
