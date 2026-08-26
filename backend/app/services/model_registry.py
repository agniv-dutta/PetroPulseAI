"""Model registry: lifecycle management for ML models.

Provides:
    - Model version tracking via ModelVersion DB entity
    - In-memory cache of fitted model instances (loaded once at startup)
    - Validation, version query, and metadata retrieval

Design rules:
    - Models are loaded once and cached; training happens on warm_cache, not on every request.
    - Each model type maps to exactly one registry code (MOD-01, MOD-02, MOD-03, ENG-01).
    - The registry never trains models; it only caches pre-fitted instances.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import ModelVersion


# ---------------------------------------------------------------- constants
MODEL_CODE_FORECAST = "MOD-01"
MODEL_CODE_ANOMALY = "MOD-02"
MODEL_CODE_SHAP = "MOD-03"
MODEL_CODE_AIPS = "ENG-01"

_MODEL_TYPE_MAP = {
    MODEL_CODE_FORECAST: "forecast",
    MODEL_CODE_ANOMALY: "anomaly",
    MODEL_CODE_SHAP: "attribution",
    MODEL_CODE_AIPS: "scoring",
}


@dataclass
class ModelInfo:
    """Read-only snapshot of a registered model version."""

    code: str
    model_name: str
    model_type: str
    version: str
    status: str
    algorithm: str | None
    task: str | None
    features: list[str]
    metrics: dict
    limitations: str | None
    training_dataset: str | None
    training_date: str | None
    registered_at: str
    notes: str | None


class ModelRegistry:
    """Singleton registry managing model versions and cached instances."""

    def __init__(self) -> None:
        self._versions: dict[str, ModelVersion] = {}  # code -> DB row
        self._instances: dict[str, object] = {}        # code -> fitted model instance
        self._loaded = False

    # ---------------------------------------------------------------- load
    def load_from_db(self, db: Session) -> int:
        """Load all ModelVersion rows into memory. Returns count loaded."""
        rows = db.execute(
            select(ModelVersion).order_by(ModelVersion.code)
        ).scalars().all()
        self._versions = {m.code: m for m in rows}
        self._loaded = True
        return len(rows)

    # ---------------------------------------------------------------- get version info
    def get_version(self, code: str) -> ModelInfo | None:
        """Return version metadata for a model code."""
        mv = self._versions.get(code)
        if mv is None:
            return None
        return _to_info(mv)

    def get_versions(self) -> list[ModelInfo]:
        """Return all registered model versions."""
        return [_to_info(mv) for mv in self._versions.values()]

    def get_version_by_name(self, model_name: str) -> ModelInfo | None:
        """Find a model version by name (case-insensitive prefix match)."""
        lower = model_name.lower()
        for mv in self._versions.values():
            if mv.model_name.lower() == lower or lower in mv.model_name.lower():
                return _to_info(mv)
        return None

    # ---------------------------------------------------------------- instances
    def register_instance(self, code: str, instance: object) -> None:
        """Cache a fitted model instance under its registry code."""
        self._instances[code] = instance

    def get_instance(self, code: str) -> object | None:
        """Return the cached fitted model instance, or None."""
        return self._instances.get(code)

    def get_forecaster(self):
        """Return cached ProductionForecaster or None."""
        return self.get_instance(MODEL_CODE_FORECAST)

    def get_anomaly_detector(self):
        """Return cached ProductionAnomalyDetector or None."""
        return self.get_instance(MODEL_CODE_ANOMALY)

    # ---------------------------------------------------------------- validate
    def validate_model(self, code: str) -> dict:
        """Validate that a model is loaded, fitted, and its DB status is ACTIVE."""
        mv = self._versions.get(code)
        if mv is None:
            return {"valid": False, "reason": f"unknown model code {code}"}
        if mv.status != "ACTIVE":
            return {"valid": False, "reason": f"model status is {mv.status}, expected ACTIVE"}
        instance = self._instances.get(code)
        if instance is None:
            return {"valid": False, "reason": "model instance not loaded in memory"}
        fitted = getattr(instance, "_fitted", None)
        if fitted is False:
            return {"valid": False, "reason": "model instance is not fitted"}
        return {"valid": True, "reason": "ok"}

    # ---------------------------------------------------------------- retrain
    def update_version(self, code: str, db: Session, **kwargs) -> ModelInfo | None:
        """Update a model version's DB row and refresh the cache."""
        mv = self._versions.get(code)
        if mv is None:
            return None
        for key, val in kwargs.items():
            if hasattr(mv, key):
                setattr(mv, key, val)
        mv.registered_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(mv)
        return _to_info(mv)

    @property
    def loaded(self) -> bool:
        return self._loaded


# ---------------------------------------------------------------- singleton
_registry: ModelRegistry | None = None


def get_model_registry() -> ModelRegistry:
    global _registry
    if _registry is None:
        _registry = ModelRegistry()
    return _registry


# ---------------------------------------------------------------- helpers
def _to_info(mv: ModelVersion) -> ModelInfo:
    return ModelInfo(
        code=mv.code,
        model_name=mv.model_name,
        model_type=_MODEL_TYPE_MAP.get(mv.code, getattr(mv, "model_type", "unknown")),
        version=mv.version,
        status=mv.status,
        algorithm=mv.algorithm,
        task=mv.task,
        features=list(mv.features) if mv.features else [],
        metrics=dict(mv.metrics) if mv.metrics else {},
        limitations=mv.limitations,
        training_dataset=mv.training_dataset,
        training_date=mv.training_date.isoformat() if mv.training_date else None,
        registered_at=mv.registered_at.isoformat(),
        notes=mv.notes,
    )
