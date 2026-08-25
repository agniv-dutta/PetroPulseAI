from typing import List, Optional, Literal

from pydantic import BaseModel, Field, ConfigDict


class ContributingFeature(BaseModel):
    feature: str
    importance: float


class AnomalyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    asset_id: str
    detected_at: str
    window_start: str
    window_end: str
    severity: Literal["NORMAL", "WATCH", "ALERT", "CRITICAL"]
    anomaly_score: float
    deviation_pct: float
    expected_bbl_d: float
    actual_bbl_d: float
    contributing_features: List[ContributingFeature]
    status: Literal["ACTIVE", "ACKNOWLEDGED", "RESOLVED"]


class AnomalyAcknowledgeRequest(BaseModel):
    status: Literal["ACKNOWLEDGED", "RESOLVED"]
    acknowledged_by: str


class AnomalyStatusUpdate(BaseModel):
    status: Literal["ACTIVE", "ACKNOWLEDGED", "RESOLVED"]
    acknowledged_by: Optional[str] = None