"""Decision-support recommendation service.

Generates prioritised, decision-support recommendations from the AIPS
component set (production deviation, anomaly severity, recovery opportunity,
intervention complexity and confidence).

Hard language rules:
    - Recommendations are decision support ONLY. They never prescribe a
      physical intervention as fact; verbs are limited to monitor /
      investigate / verify / review / evaluate.
    - Every payload carries the platform disclaimer below.
"""

from __future__ import annotations

from dataclasses import dataclass, field

DECISION_SUPPORT_DISCLAIMER = (
    "Decision support only. These recommendations do not prescribe operational "
    "actions, do not assert physical causes, and are not a substitute for "
    "engineering judgement."
)


@dataclass
class Recommendation:
    code: str
    action: str          # short decision-support phrasing (see examples contract)
    rationale: str       # which components triggered it
    priority: str        # follows AIPS banding vocabulary


@dataclass
class RecommendationSet:
    asset_id: str | None
    recommendations: list[Recommendation] = field(default_factory=list)
    summary: str = ""
    disclaimer: str = DECISION_SUPPORT_DISCLAIMER

    def to_dict(self) -> dict:
        return {
            "asset_id": self.asset_id,
            "recommendations": [
                {
                    "code": r.code,
                    "action": r.action,
                    "rationale": r.rationale,
                    "priority": r.priority,
                }
                for r in self.recommendations
            ],
            "summary": self.summary,
            "disclaimer": self.disclaimer,
        }


def generate_recommendations(
    *,
    deviation_pct: float,
    anomaly_score: float,
    anomaly_severity: str,
    recovery_opportunity_pct: float,
    estimated_volume_mmbbl: float,
    combined_confidence: float,
    intervention_complexity: float,
    aips_priority: str,
    asset_id: str | None = None,
) -> RecommendationSet:
    """Rule-based, deterministic decision-support recommendations.

    Inputs are the approved AIPS component set; outputs never claim a
    physical intervention as fact.
    """
    out = RecommendationSet(asset_id=asset_id)
    dev_abs = abs(float(deviation_pct))
    score = float(anomaly_score)
    complexity = min(max(float(intervention_complexity), 0.0), 1.0)
    confidence = min(max(float(combined_confidence), 0.0), 1.0)

    def add(code: str, action: str, rationale: str) -> None:
        out.recommendations.append(
            Recommendation(code=code, action=action, rationale=rationale, priority=aips_priority)
        )

    # 1. Baseline posture ----------------------------------------------------
    if dev_abs < 5.0 and score < 0.5:
        add(
            "MONITOR_ASSET",
            "Monitor asset",
            f"deviation {dev_abs:.1f}% is within tolerance and anomaly score "
            f"{score:.2f} is NORMAL-band",
        )
    else:
        # 2. Deviation investigation -----------------------------------------
        if dev_abs >= 10.0 or score >= 0.70:
            add(
                "INVESTIGATE_DEVIATION",
                "Investigate production deviation",
                f"production deviates {deviation_pct:+.1f}% from expectation with "
                f"anomaly severity {anomaly_severity}",
            )
        elif dev_abs >= 5.0:
            add(
                "INVESTIGATE_DEVIATION",
                "Investigate production deviation",
                f"production deviates {deviation_pct:+.1f}% from expectation",
            )

        # 3. Operational parameter verification -------------------------------
        if score >= 0.70 or anomaly_severity in ("ALERT", "CRITICAL"):
            add(
                "VERIFY_OPERATIONAL_PARAMETERS",
                "Verify operational parameters",
                f"Isolation Forest severity {anomaly_severity} (score {score:.2f}) "
                "warrants checking reported operating conditions before conclusions",
            )

    # 4. Engineering review for high-priority assets --------------------------
    if aips_priority in ("HIGH", "CRITICAL"):
        add(
            "PRIORITIZE_ENGINEERING_REVIEW",
            "Prioritize engineering review",
            f"AIPS priority {aips_priority} driven by loss/anomaly/recovery mix",
        )

    # 5. Field verification ahead of any intervention consideration ----------
    meaningful_opportunity = (
        recovery_opportunity_pct >= 8.0 or estimated_volume_mmbbl >= 0.05
    )
    if meaningful_opportunity and confidence >= 0.60:
        add(
            "FIELD_VERIFICATION_RECOMMENDED",
            "Field verification recommended",
            f"estimated recovery opportunity {recovery_opportunity_pct:.1f}% at "
            f"{confidence*100:.0f}% combined confidence - validate on-site data "
            "before evaluating intervention options",
        )
    elif meaningful_opportunity and confidence < 0.60:
        add(
            "CONFIDENCE_GAP_REVIEW",
            "Review diagnosis confidence",
            f"opportunity exists but combined confidence is {confidence*100:.0f}%; "
            "gather additional verification before further action",
        )

    # 6. High complexity feasibility caution ----------------------------------
    if complexity > 0.70 and meaningful_opportunity:
        add(
            "COMPLEXITY_FEASIBILITY_REVIEW",
            "Assess intervention feasibility and cost",
            f"intervention complexity {complexity:.2f} is high; weigh expected "
            "opportunity against execution difficulty - decision support, not an "
            "instruction to intervene",
        )

    if not out.recommendations:
        add("NO_ACTION_INDICATED", "Monitor asset", "no thresholds exceeded")

    order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
    out.recommendations.sort(key=lambda r: (order.get(r.priority, 9), r.code))

    top = out.recommendations[0]
    out.summary = f"{len(out.recommendations)} decision-support item(s); lead action: {top.action}"
    return out
