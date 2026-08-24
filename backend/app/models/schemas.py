"""Pydantic schemas for request/response validation."""

import uuid
from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    service: str
    version: str
    database_connected: bool
    redis_connected: bool = False
    timestamp: datetime


class AssetBase(BaseModel):
    """Base asset schema."""
    asset_id: str = Field(..., max_length=64, description="Human-readable code, e.g. MH-07")
    field_name: str = Field(..., max_length=120)
    basin: str = Field(..., max_length=120)
    status: str = "ACTIVE"
    latitude: float
    longitude: float


class AssetCreate(AssetBase):
    """Schema for creating an asset (UUID primary key is generated)."""


class AssetUpdate(BaseModel):
    """Schema for updating an asset."""
    field_name: str | None = None
    basin: str | None = None
    status: str | None = None
    latitude: float | None = None
    longitude: float | None = None


class AssetResponse(AssetBase):
    """Schema for asset response."""
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MonthlyProductionBase(BaseModel):
    """Base production-history schema (canonical production_history table)."""
    timestamp: datetime
    production: float
    pressure: float | None = None
    temperature: float | None = None
    flow_rate: float | None = None
    valve_status: str | None = None
    source: str | None = None
    source_type: str = "SYNTHETIC"


class MonthlyProductionCreate(MonthlyProductionBase):
    """Schema for creating a production-history row."""
    asset_id: str


class MonthlyProductionResponse(MonthlyProductionBase):
    """Schema for production-history response."""
    id: uuid.UUID
    asset_id: str
    created_at: datetime

    class Config:
        from_attributes = True


class ForecastRequest(BaseModel):
    """Schema for forecast request."""
    asset_id: str
    horizon_days: int = Field(..., ge=1, le=3650)
    model_name: str = "arps"


class ForecastResponse(BaseModel):
    """Schema for forecast response."""
    asset_id: str
    model_name: str
    horizon_days: int
    created_at: datetime
    metrics: dict[str, float]
    params: dict[str, Any]
    series: list[dict[str, Any]]
    feature_importance: list[dict[str, Any]]


class AnomalyRequest(BaseModel):
    """Schema for anomaly detection request."""
    asset_id: str
    window_start: date
    window_end: date


class AnomalyResponse(BaseModel):
    """Schema for anomaly detection response."""
    id: str
    asset_id: str
    detected_at: datetime
    window_start: date
    window_end: date
    severity: str
    anomaly_score: float
    deviation_pct: float
    expected_bbl_d: float
    actual_bbl_d: float
    contributing_features: list[dict[str, Any]]
    status: str


class AIPSScoreRequest(BaseModel):
    """Schema for AIPS scoring request."""
    asset_id: str


class AIPSScoreResponse(BaseModel):
    """Schema for AIPS scoring response."""
    asset_id: str
    aips_score: float
    priority: str
    breakdown: dict[str, Any]
    created_at: datetime


class SHAPExplanationRequest(BaseModel):
    """Schema for SHAP explanation request."""
    asset_id: str
    forecast_run_id: int


class SHAPExplanationResponse(BaseModel):
    """Schema for SHAP explanation response."""
    asset_id: str
    forecast_run_id: int
    shap_values: list[dict[str, Any]]
    feature_names: list[str]
    base_value: float


class MetricsRequest(BaseModel):
    """Schema for metrics request."""
    asset_id: str
    start_date: date
    end_date: date


class MetricsResponse(BaseModel):
    """Schema for metrics response."""
    asset_id: str
    period: dict[str, date]
    production_metrics: dict[str, float]
    financial_metrics: dict[str, float]
    operational_metrics: dict[str, float]


class SimulationStartRequest(BaseModel):
    """Schema for starting a simulation."""
    asset_id: str
    scenario: str = "NORMAL"


class SimulationResponse(BaseModel):
    """Schema for simulation response."""
    session_id: str
    asset_id: str
    scenario: str
    created_at: datetime
    ticks_sent: int
    status: str


class SimulationUpdateRequest(BaseModel):
    """Schema for updating a simulation."""
    scenario: str


class ModelRegistryResponse(BaseModel):
    """Schema for model registry response."""
    id: str
    name: str
    task: str
    algorithm: str
    trained_at: datetime
    metrics: dict[str, Any]
    status: str

    class Config:
        from_attributes = True


class RetrainRequest(BaseModel):
    """Schema for model retraining request."""
    force: bool = False
