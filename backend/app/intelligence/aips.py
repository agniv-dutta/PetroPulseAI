"""AIPS — Asset Intervention Priority Score.

Formula parity contract with frontend/src/utils/aipsCalculator.ts:
  AIPS = 0.35*Loss_norm + 0.25*Anomaly_norm + 0.40*Recovery_norm
         - 0.10*Complexity_norm, clamped to [0, 100]
Priority bands: >=80 CRITICAL, >=60 HIGH, >=40 MEDIUM else LOW.
"""

from dataclasses import dataclass

LOSS_REFERENCE_PCT = 18.0   # loss % mapped to 100 points
RECOVERY_REFERENCE_PCT = 15.0


@dataclass
class AIPSInput:
    expected_bbl_d: float
    actual_bbl_d: float
    anomaly_score: float          # [0,1]
    recovery_gap_pct: float       # estimated recoverable volume as % of expected
    combined_confidence: float    # [0,1]
    complexity: float = 0.5       # [0,1] intervention difficulty
    oil_price_usd: float = 75.0


@dataclass
class AIPSOutput:
    score: float
    priority: str
    components: dict
    confidence_breakdown: dict
    estimated_recovery_mmbbl: float
    estimated_value_usd_m: float

    def to_dict(self) -> dict:
        return {
            "score": round(self.score, 1),
            "priority": self.priority,
            "components": self.components,
            "confidence_breakdown": self.confidence_breakdown,
            "estimated_recovery_mmbbl": round(self.estimated_recovery_mmbbl, 3),
            "estimated_value_usd_m": round(self.estimated_value_usd_m, 2),
            "formula": (
                "AIPS = 0.35*Loss + 0.25*Anomaly + 0.40*Recovery - 0.10*Complexity"
            ),
            "disclaimer": (
                "Decision-support estimate derived from public/synthetic data. "
                "Not an operational instruction."
            ),
        }


def _clamp(v: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, v))


def priority_for_score(score: float) -> str:
    if score >= 80:
        return "CRITICAL"
    if score >= 60:
        return "HIGH"
    if score >= 40:
        return "MEDIUM"
    return "LOW"


def anomaly_confidence(anomaly_score: float) -> float:
    if anomaly_score > 0.85:
        return 0.90
    if anomaly_score > 0.70:
        return 0.75
    return 0.60


def calculate_aips(inp: AIPSInput) -> AIPSOutput:
    expected = max(inp.expected_bbl_d, 1e-9)
    loss_pct = abs(expected - inp.actual_bbl_d) / expected * 100.0

    loss_norm = _clamp(loss_pct / LOSS_REFERENCE_PCT * 100.0)
    anomaly_norm = _clamp(inp.anomaly_score * 100.0)

    recovery_raw = inp.recovery_gap_pct * inp.combined_confidence
    recovery_norm = _clamp(recovery_raw / RECOVERY_REFERENCE_PCT * 100.0)
    complexity_norm = _clamp(inp.complexity * 100.0)

    score = _clamp(
        0.35 * loss_norm + 0.25 * anomaly_norm + 0.40 * recovery_norm - 0.10 * complexity_norm
    )

    # Recovery opportunity: gap volume over a 12-month window at the current gap.
    gap_bbl_d = max(expected - inp.actual_bbl_d, 0.0)
    est_recovery_mmbbl = gap_bbl_d * 365.0 / 1e6
    est_value_usd_m = est_recovery_mmbbl * 1e6 * inp.oil_price_usd / 1e6

    return AIPSOutput(
        score=score,
        priority=priority_for_score(score),
        components={
            "loss": {"raw_pct": round(loss_pct, 2), "normalized": round(loss_norm, 1),
                     "weight": 0.35, "contribution": round(0.35 * loss_norm, 2)},
            "anomaly": {"raw_score": round(inp.anomaly_score, 3), "normalized": round(anomaly_norm, 1),
                        "weight": 0.25, "contribution": round(0.25 * anomaly_norm, 2)},
            "recovery": {"raw_gap_pct": round(inp.recovery_gap_pct, 2), "confidence": round(inp.combined_confidence, 2),
                         "normalized": round(recovery_norm, 1), "weight": 0.40,
                         "contribution": round(0.40 * recovery_norm, 2)},
            "complexity": {"raw": round(inp.complexity, 3), "normalized": round(complexity_norm, 1),
                           "weight": -0.10, "contribution": round(-0.10 * complexity_norm, 2)},
        },
        confidence_breakdown={
            "anomaly_confidence": anomaly_confidence(inp.anomaly_score),
            "historical_recovery_rate": 0.72,
            "model_confidence": 0.85,
            "combined_confidence": round(inp.combined_confidence, 3),
        },
        estimated_recovery_mmbbl=est_recovery_mmbbl,
        estimated_value_usd_m=est_value_usd_m,
    )
