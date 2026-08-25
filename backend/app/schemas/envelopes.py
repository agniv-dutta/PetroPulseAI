"""Response envelope models for OpenAPI documentation.

These envelopes are intentionally permissive (``extra="allow"``): they pin
the contractual top-level keys of every list/detail endpoint while letting
the underlying intelligence pipeline enrich payloads with additional
diagnostic fields. Rich nested structures remain typed through the
companion schema modules (forecast, anomaly, aips, ...).
"""

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict


class _Envelope(BaseModel):
    model_config = ConfigDict(extra="allow")


class AssetListResponse(_Envelope):
    rows: List[Dict[str, Any]] = []
    count: int = 0


class LeaderboardResponse(_Envelope):
    rows: List[Dict[str, Any]] = []
    count: int = 0
    generated_at: Optional[str] = None


class AnomalyActiveResponse(_Envelope):
    rows: List[Dict[str, Any]] = []
    count: int = 0
    generated_at: Optional[str] = None


class AnomalyAssetResponse(_Envelope):
    asset_id: str
    severity: str = "NORMAL"
    anomaly_score: float = 0.0


class RankingResponse(_Envelope):
    rows: List[Dict[str, Any]] = []
    generated_at: Optional[str] = None


class ShapExplanationEnvelope(_Envelope):
    asset_id: str
    terminology: str = "Model-Estimated Feature Contributions"


class ForecastMetricsEnvelope(_Envelope):
    model: str = ""
    overall: Dict[str, Any] = {}
    horizons: List[Dict[str, Any]] = []


class AnomalyMetricsEnvelope(_Envelope):
    aggregate: Dict[str, Any] = {}
    per_asset: List[Dict[str, Any]] = []


class SimulationAckResponse(_Envelope):
    session_id: str
