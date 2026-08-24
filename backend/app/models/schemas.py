"""Pydantic schemas for request/response validation."""

from datetime import date, datetime
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator


class HealthResponse(BaseModel):
    """Health check response."""
    status: Literal["healthy", "unhealthy"]
    service: str
    version: str
    database_connected: bool
    redis_connected: bool = False
    timestamp: datetime


class AssetBase(BaseModel):
    """Base asset schema."""
    name: str = Field(..., max_length=120)
    field: str = Field(..., max_length=120)
    basin: str = Field(..., max_length=120)
    latitude: float
    longitude: float
    onstream_year: int
    status: str = "ACTIVE"
    baseline_qi: float = Field(..., description="Initial rate, bbl/d")
    baseline_di: float = Field(..., description="Nominal decline /month")
    baseline_b: float = Field(..., description="Arps exponent")
    operating_cost_usd_m: float = 1.0
    intervention_cost_usd_m: float = 1.0


class AssetCreate(AssetBase):
    """Schema for creating an asset."""
    id: str = Field(..., max_length=32)


class AssetUpdate(BaseModel):
    """Schema for updating an asset."""
    name: str | None = None
    field: str | None = None
    basin: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    status: str | None = None
    operating_cost_usd_m: float | None = None
    intervention_cost_usd_m: float | None = None


class AssetResponse(AssetBase):
    """Schema for asset response."""
    id: str

    class Config:
        from_attributes = True


class MonthlyProductionBase(BaseModel):
    """Base monthly production schema."""
    period: date
    oil_bbl_d: float
    expected_bbl_d: float
    gas_mmcf_d: float = 0.0
    water_cut_pct: float = 0.0
    source: str = "DERIVED"


class MonthlyProductionCreate(MonthlyProductionBase):
    """Schema for creating monthly production."""
    asset_id: str


class MonthlyProductionResponse(MonthlyProductionBase):
    """Schema for monthly production response."""
    id: int
    asset_id: str
    provenance_id: int | None = None

    class Config:
        from_attributes = True


class ForecastRequest(BaseModel):
    """Schema for forecast request."""
    asset_id: str
    horizon_days: int = Field(..., ge=1, le=3650)
    model_name: str = "arps"


class ForecastPoint(BaseModel):
    """Single forecast point."""
    step: int
    forecast: float
    lower: float
    upper: float


class ForecastMetrics(BaseModel):
    """Forecast performance metrics."""
    mae: float
    rmse: float
    r2: float
    mape: float


class ForecastResponse(BaseModel):
    """Schema for forecast response."""
    asset_id: str
    horizon: int
    forecast: list[ForecastPoint]
    model: str
    confidence: float
    metrics: ForecastMetrics
    historical_points: list[dict[str, Any]]
    forecast_points: list[ForecastPoint]


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
    severity: Literal["CRITICAL", "ALERT", "WATCH", "NORMAL"]
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
    priority: Literal["CRITICAL", "HIGH", "MEDIUM", "LOW"]
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
    simulation_id: str
    asset_id: str
    scenario: str
    created_at: datetime
    status: Literal["RUNNING", "PAUSED", "STOPPED"]
    ticks_sent: int


class SimulationTelemetry(BaseModel):
    """Simulation telemetry data."""
    type: Literal["telemetry"]
    timestamp: datetime
    asset_id: str
    source_type: Literal["SYNTHETIC", "REAL"]
    production: float
    pressure: float
    temperature: float
    flow_rate: float
    forecast: float
    anomaly_score: float
    severity: Literal["CRITICAL", "ALERT", "WATCH", "NORMAL"]
    aips_score: float
    priority: Literal["CRITICAL", "HIGH", "MEDIUM", "LOW"]
    recovery_opportunity: float
    confidence: float


class SimulationEvent(BaseModel):
    """Simulation event message."""
    type: Literal["simulation_started", "anomaly_injected", "priority_changed", "simulation_stopped", "error"]
    timestamp: datetime
    simulation_id: str
    message: str
    data: dict[str, Any] = {}


class ErrorResponse(BaseModel):
    """Error response schema."""
    error: str
    message: str
    status_code: int
    details: dict[str, Any] = {}


class ForecastMetricsResponse(BaseModel):
    """Forecast metrics response."""
    horizon: str
    mae: float
    rmse: float
    r2: float
    mape: float


class AnomalyMetricsResponse(BaseModel):
    """Anomaly metrics response."""
    precision: float
    recall: float
    f1: float
    accuracy: float
    roc_auc: float
    true_positives: int
    false_positives: int
    false_negatives: int
    true_negatives: int


class AssetRankingResponse(BaseModel):
    """Asset ranking response."""
    rank: int
    asset_id: str
    asset_name: str
    aips_score: float
    priority: Literal["CRITICAL", "HIGH", "MEDIUM", "LOW"]
    field: str
    basin: str


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
