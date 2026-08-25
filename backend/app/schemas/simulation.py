from typing import List, Optional, Literal, Dict, Any

from pydantic import BaseModel, Field, ConfigDict


class SimulationStartRequest(BaseModel):
    asset_id: str
    scenario: Optional[str] = Field(default="NORMAL")


class InjectAnomalyRequest(BaseModel):
    severity: str
    magnitude: float


class SimulationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    simulation_id: str
    asset_id: str
    scenario: str
    created_at: str
    status: Literal["RUNNING", "PAUSED", "STOPPED"]
    ticks_sent: int


class SimulationTelemetry(BaseModel):
    type: Literal["telemetry"]
    timestamp: str
    asset_id: str
    source_type: Literal["SYNTHETIC", "REAL"]
    production: float
    pressure: float
    temperature: float
    flow_rate: float
    forecast: float
    anomaly_score: float
    severity: Literal["NORMAL", "WATCH", "ALERT", "CRITICAL"]
    aips_score: float
    priority: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    recovery_opportunity: float
    confidence: float


class SimulationEvent(BaseModel):
    type: Literal[
        "simulation_started",
        "anomaly_injected",
        "priority_changed",
        "simulation_stopped",
        "error",
    ]
    timestamp: str
    simulation_id: str
    message: str
    data: Optional[Dict[str, Any]] = None