"""AIPS - Asset Intervention Priority Score (backend source of truth).

Approved definition (docs/CORRECTIONS_SUMMARY_AND_GUIDE.md, Issue 2):

    AIPS = (0.30 x Loss_Magnitude)
         + (0.25 x Anomaly_Severity)
         + (0.35 x Recovery_Opportunity)
         - (0.10 x Intervention_Complexity)

    Loss_Magnitude          = |Expected - Actual| / Expected x 100  (always positive)
    Anomaly_Severity        = Isolation Forest anomaly score (0-1, scaled x100)
    Recovery_Opportunity    = (Expected - Actual) / Expected x 100
                              x Historical_Rate x Confidence      (percentage points)
    Intervention_Complexity = normalized 0-1 (penalised x100)

The raw weighted sum is presented on a 0-100 scale via a configurable
reference (`aips_scale_reference`, default 30) so the approved MH-07
reference scenario reproduces ~92/100 -> CRITICAL.

CENTRALISATION CONTRACT: this service is the ONLY implementation of AIPS in
the platform. The frontend must render the component breakdown returned by
the backend and must not independently calculate a competing score.
"""

from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np

from app.core.config import get_settings
from app.services.recovery_service import RecoveryEstimate, estimate_recovery_opportunity

AIPS_WEIGHTS: dict[str, float] = {
    "loss": 0.30,
    "anomaly": 0.25,
    "recovery": 0.35,
    "complexity": -0.10,
}

AIPS_FORMULA = (
    "AIPS = 0.30 x Loss_Magnitude + 0.25 x Anomaly_Severity "
    "+ 0.35 x Recovery_Opportunity - 0.10 x Intervention_Complexity"
)

AIPS_DISCLAIMER = (
    "Decision-support estimate computed by the PetroPulse backend from "
    "public/synthetic inputs. The backend is the single source of truth for "
    "this score; it is not an operational instruction."
)


@dataclass
class AIPSInput:
    expected_bbl_d: float
    actual_bbl_d: float
    anomaly_score: float            # [0,1] from the Isolation Forest layer
    intervention_complexity: float = 0.5   # normalized [0,1]
    recovery: RecoveryEstimate | None = None
    oil_price_usd: float = 75.0


@dataclass
class AIPSPriorityThresholds:
    critical: float
    high: float
    medium: float

    @classmethod
    def from_settings(cls) -> "AIPSPriorityThresholds":
        t = get_settings().aips_priority_thresholds
        return cls(
            critical=float(t.get("CRITICAL", 80.0)),
            high=float(t.get("HIGH", 60.0)),
            medium=float(t.get("MEDIUM", 40.0)),
        )

    def for_score(self, score: float) -> str:
        if score >= self.critical:
            return "CRITICAL"
        if score >= self.high:
            return "HIGH"
        if score >= self.medium:
            return "MEDIUM"
        return "LOW"


def priority_for_score(score: float, thresholds: AIPSPriorityThresholds | None = None) -> str:
    """Configuration-driven priority banding: CRITICAL / HIGH / MEDIUM / LOW."""
    return (thresholds or AIPSPriorityThresholds.from_settings()).for_score(score)


@dataclass
class AIPSResult:
    raw_score: float                 # un-scaled weighted sum
    score: float                     # presented 0-100 score
    priority: str
    loss_magnitude_pct: float
    anomaly_severity_scaled: float   # anomaly score x 100
    recovery_opportunity_pct: float
    intervention_complexity_scaled: float
    components: dict
    recovery: RecoveryEstimate
    scale_reference: float
    warnings: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "model": "aips",
            "score": round(self.score, 1),
            "raw_score": round(self.raw_score, 2),
            "priority": self.priority,
            "formula": AIPS_FORMULA,
            "weights": dict(AIPS_WEIGHTS),
            "scale_reference": self.scale_reference,
            "breakdown": {
                "loss_magnitude_pct": round(self.loss_magnitude_pct, 2),
                "anomaly_severity": round(self.anomaly_severity_scaled, 1),
                "recovery_opportunity_pct": round(self.recovery_opportunity_pct, 2),
                "intervention_complexity": round(self.intervention_complexity_scaled / 100.0, 3),
            },
            "components": self.components,
            "confidence_breakdown": {
                "historical_recovery_rate": round(self.recovery.historical_success_rate, 3),
                "model_confidence": round(self.recovery.model_confidence, 3),
                "combined_confidence": round(self.recovery.combined_confidence, 3),
            },
            "estimated_recovery_mmbbl": round(self.recovery.estimated_volume_mmbbl, 3),
            "estimated_value_usd_m": round(self.recovery.estimated_value_usd_m, 2),
            "recovery_caveat": self.recovery.caveat,
            "disclaimer": AIPS_DISCLAIMER,
            "warnings": list(self.warnings),
        }


def calculate_aips(inp: AIPSInput) -> AIPSResult:
    """Compute the approved AIPS with a complete component breakdown."""
    settings = get_settings()
    expected = max(float(inp.expected_bbl_d), 1e-9)
    actual = float(inp.actual_bbl_d)
    anomaly_score = min(max(float(inp.anomaly_score), 0.0), 1.0)
    complexity = min(max(float(inp.intervention_complexity), 0.0), 1.0)

    # --- approved components -------------------------------------------------
    loss_magnitude_pct = abs(expected - actual) / expected * 100.0
    recovery = inp.recovery or estimate_recovery_opportunity(
        inp.expected_bbl_d, actual, anomaly_score, oil_price_usd=inp.oil_price_usd
    )
    recovery_opportunity_pct = (
        max(expected - actual, 0.0) / expected * 100.0
        * recovery.historical_success_rate * recovery.model_confidence
    )

    loss_contribution = AIPS_WEIGHTS["loss"] * loss_magnitude_pct
    anomaly_contribution = AIPS_WEIGHTS["anomaly"] * anomaly_score * 100.0
    recovery_contribution = AIPS_WEIGHTS["recovery"] * recovery_opportunity_pct
    complexity_penalty = AIPS_WEIGHTS["complexity"] * complexity * 100.0  # negative

    raw_score = loss_contribution + anomaly_contribution + recovery_contribution + complexity_penalty

    scale_reference = max(float(settings.aips_scale_reference), 1e-9)
    score = float(np.clip(raw_score / scale_reference * 100.0, 0.0, 100.0))

    warnings: list[str] = []
    if anomaly_score < 0.5 and loss_magnitude_pct > 20.0:
        warnings.append(
            "large production loss without a corresponding model-flagged anomaly; "
            "treat the diagnosis confidence as low"
        )
    if recovery.gap_bbl_d <= 0.0:
        warnings.append("no current production gap - recovery opportunity is zero")

    components = {
        "loss": {
            "label": "Loss_Magnitude",
            "raw_pct": round(loss_magnitude_pct, 2),
            "weight": AIPS_WEIGHTS["loss"],
            "contribution": round(loss_contribution, 2),
        },
        "anomaly": {
            "label": "Anomaly_Severity",
            "raw_score": round(anomaly_score, 3),
            "scaled": round(anomaly_score * 100.0, 1),
            "weight": AIPS_WEIGHTS["anomaly"],
            "contribution": round(anomaly_contribution, 2),
        },
        "recovery": {
            "label": "Recovery_Opportunity",
            "raw_pct": round(recovery_opportunity_pct, 2),
            "weight": AIPS_WEIGHTS["recovery"],
            "contribution": round(recovery_contribution, 2),
            "basis": "Estimated Recovery Opportunity (not guaranteed)",
        },
        "complexity": {
            "label": "Intervention_Complexity",
            "raw": round(complexity, 3),
            "scaled": round(complexity * 100.0, 1),
            "weight": AIPS_WEIGHTS["complexity"],
            "contribution": round(complexity_penalty, 2),
        },
    }

    return AIPSResult(
        raw_score=raw_score,
        score=score,
        priority=priority_for_score(score),
        loss_magnitude_pct=loss_magnitude_pct,
        anomaly_severity_scaled=anomaly_score * 100.0,
        recovery_opportunity_pct=recovery_opportunity_pct,
        intervention_complexity_scaled=complexity * 100.0,
        components=components,
        recovery=recovery,
        scale_reference=scale_reference,
        warnings=warnings,
    )
