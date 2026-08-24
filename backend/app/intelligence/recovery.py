"""DEPRECATED shim - canonical recovery logic lives in
app/services/recovery_service.py. Kept only for legacy import paths."""

from app.services.recovery_service import (  # noqa: F401
    ESTIMATED_RECOVERY_LABEL,
    RECOVERY_CAVEAT,
    RecoveryEstimate as RecoveryOpportunity,
    estimate_recovery_opportunity as estimate_recovery,
    model_confidence_for_anomaly as anomaly_confidence_tier,
)
