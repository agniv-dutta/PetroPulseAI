from typing import Dict, Any, Optional, Literal

from pydantic import BaseModel, Field, ConfigDict


class AIPSBreakdown(BaseModel):
    loss: Dict[str, Any]
    anomaly: Dict[str, Any]
    recovery: Dict[str, Any]
    complexity: Dict[str, Any]


class AIPSScoreResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    asset_id: str
    aips_score: float
    priority: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    breakdown: Dict[str, Any]
    confidence: float
    created_at: str


class AssetRankingResponse(BaseModel):
    rank: int
    asset_id: str
    asset_name: str
    aips_score: float
    priority: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    field: str
    basin: str
    deviation: float
    recovery_potential: float