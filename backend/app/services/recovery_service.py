"""Recovery opportunity service - the single source of truth for recovery.

Approved definition (docs/CORRECTIONS_SUMMARY_AND_GUIDE.md, Issue 3):

    Recovery_Opportunity_Volume = Current_Loss
                                x Historical_Recovery_Rate
                                x Model_Confidence

    Historical_Recovery_Rate ~ 80%  (share of similar interventions that
                                     succeeded; configuration-driven)
    Model_Confidence         = f(anomaly score)
                             = 0.90 if score > 0.85
                             = 0.75 if 0.70 <= score <= 0.85
                             = 0.60 otherwise
    Combined_Confidence      = average of both factors

Labelling contract (hard requirement):
    This quantity is ALWAYS presented as an "Estimated Recovery Opportunity".
    NEVER as a "Guaranteed Recovery". Every payload carries the caveat:

        "Actual recovery depends on intervention execution, root-cause
         verification and reservoir/field conditions."
"""

from __future__ import annotations

from dataclasses import dataclass

from app.core.config import get_settings

ESTIMATED_RECOVERY_LABEL = "Estimated Recovery Opportunity"
RECOVERY_CAVEAT = (
    "Actual recovery depends on intervention execution, root-cause "
    "verification and reservoir/field conditions."
)


def model_confidence_for_anomaly(anomaly_score: float) -> float:
    """Model confidence as a function of the anomaly score (approved tiers)."""
    if anomaly_score > 0.85:
        return 0.90
    if anomaly_score >= 0.70:
        return 0.75
    return 0.60


@dataclass
class RecoveryEstimate:
    gap_bbl_d: float
    current_loss_volume_mmbbl_12m: float
    historical_success_rate: float
    model_confidence: float
    combined_confidence: float
    estimated_volume_mmbbl: float
    estimated_value_usd_m: float
    label: str = ESTIMATED_RECOVERY_LABEL
    caveat: str = RECOVERY_CAVEAT

    # Legacy alias used across pipeline/UI payloads.
    @property
    def estimated_recovery_mmbbl(self) -> float:
        return self.estimated_volume_mmbbl

    def to_dict(self) -> dict:
        return {
            "label": self.label,
            "gap_bbl_d": round(self.gap_bbl_d, 1),
            "current_loss_volume_mmbbl_12m": round(self.current_loss_volume_mmbbl_12m, 3),
            "estimated_volume": round(self.estimated_volume_mmbbl, 3),
            "estimated_volume_unit": "MMbbl (12-month window)",
            "estimated_recovery_mmbbl": round(self.estimated_volume_mmbbl, 3),  # legacy alias
            "estimated_value_usd_m": round(self.estimated_value_usd_m, 2),
            "confidence": round(self.combined_confidence, 3),
            "historical_success_rate": round(self.historical_success_rate, 3),
            "model_confidence": round(self.model_confidence, 3),
            "combined_confidence": round(self.combined_confidence, 3),
            "caveat": self.caveat,
            "methodology": (
                "Estimated Recovery Opportunity = current loss volume "
                "x historical recovery rate x model confidence. DERIVED estimate - "
                "not a reservoir-simulation result and not a guarantee."
            ),
        }


def estimate_recovery_opportunity(
    expected_bbl_d: float,
    actual_bbl_d: float,
    anomaly_score: float,
    historical_recovery_rate: float | None = None,
    oil_price_usd: float = 75.0,
) -> RecoveryEstimate:
    """Estimate the recoverable opportunity behind a production shortfall.

    Current loss is the annualised volume of the expected-vs-actual gap;
    the recoverable share scales it by the historical intervention success
    rate and the model's confidence in the underlying diagnosis.
    """
    settings = get_settings()
    hist_rate = (
        float(settings.recovery_historical_rate)
        if historical_recovery_rate is None
        else float(historical_recovery_rate)
    )
    hist_rate = min(max(hist_rate, 0.0), 1.0)

    gap_bbl_d = max(float(expected_bbl_d) - float(actual_bbl_d), 0.0)
    loss_volume_mmbbl = gap_bbl_d * 365.0 / 1e6

    model_conf = model_confidence_for_anomaly(anomaly_score)
    combined = (hist_rate + model_conf) / 2.0

    estimated_volume = loss_volume_mmbbl * hist_rate * model_conf
    estimated_value_usd_m = estimated_volume * 1e6 * oil_price_usd / 1e6

    return RecoveryEstimate(
        gap_bbl_d=gap_bbl_d,
        current_loss_volume_mmbbl_12m=loss_volume_mmbbl,
        historical_success_rate=hist_rate,
        model_confidence=model_conf,
        combined_confidence=combined,
        estimated_volume_mmbbl=estimated_volume,
        estimated_value_usd_m=estimated_value_usd_m,
    )
