"""Estimated recovery opportunity estimator."""

from dataclasses import dataclass


@dataclass
class RecoveryOpportunity:
    gap_bbl_d: float
    loss_volume_mmbbl_12m: float
    estimated_recovery_mmbbl: float
    estimated_value_usd_m: float
    confidence_tier: str
    combined_confidence: float

    def to_dict(self) -> dict:
        return {
            "gap_bbl_d": round(self.gap_bbl_d, 1),
            "loss_volume_mmbbl_12m": round(self.loss_volume_mmbbl_12m, 3),
            "estimated_recovery_mmbbl": round(self.estimated_recovery_mmbbl, 3),
            "estimated_value_usd_m": round(self.estimated_value_usd_m, 2),
            "confidence_tier": self.confidence_tier,
            "combined_confidence": round(self.combined_confidence, 3),
            "methodology": (
                "Recovery estimate = production gap volume x combined confidence "
                "(historical intervention success blended with model confidence). "
                "DERIVED estimate — not a reservoir-simulation result."
            ),
        }


def estimate_recovery(
    expected_bbl_d: float,
    actual_bbl_d: float,
    anomaly_score: float,
    historical_recovery_rate: float = 0.72,
    model_confidence: float = 0.85,
    oil_price_usd: float = 75.0,
) -> RecoveryOpportunity:
    gap = max(expected_bbl_d - actual_bbl_d, 0.0)
    loss_12m = gap * 365.0 / 1e6

    anomaly_conf = anomaly_confidence_tier(anomaly_score)
    combined = (historical_recovery_rate + model_confidence + anomaly_conf) / 3.0
    recovery = loss_12m * combined

    if anomaly_score > 0.85:
        tier = "HIGH"
    elif anomaly_score > 0.70:
        tier = "MEDIUM"
    else:
        tier = "BASE"

    return RecoveryOpportunity(
        gap_bbl_d=gap,
        loss_volume_mmbbl_12m=loss_12m,
        estimated_recovery_mmbbl=recovery,
        estimated_value_usd_m=recovery * 1e6 * oil_price_usd / 1e6,
        confidence_tier=tier,
        combined_confidence=combined,
    )


def anomaly_confidence_tier(anomaly_score: float) -> float:
    if anomaly_score > 0.85:
        return 0.90
    if anomaly_score > 0.70:
        return 0.75
    return 0.60
