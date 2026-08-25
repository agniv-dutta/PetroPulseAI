from typing import List, Optional, Literal

from pydantic import BaseModel, Field, ConfigDict


class ForecastPoint(BaseModel):
    step: int
    forecast: float
    lower: float
    upper: float


class ForecastMetrics(BaseModel):
    mae: float
    rmse: float
    r2: float
    mape: float


class HistoricalPoint(BaseModel):
    period: str
    oil_bbl_d: float
    expected_bbl_d: float


class ForecastRequest(BaseModel):
    asset_id: str
    horizon_days: int = Field(default=90, ge=30, le=365)
    model: Optional[str] = Field(default=None)


class ForecastResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    asset_id: str
    horizon: int
    model: str
    confidence: float
    metrics: ForecastMetrics
    forecast: List[ForecastPoint]
    historical_points: List[HistoricalPoint]
    forecast_points: List[ForecastPoint]


class ForecastMetricsResponse(BaseModel):
    horizon: str
    mae: float
    rmse: float
    r2: float
    mape: float