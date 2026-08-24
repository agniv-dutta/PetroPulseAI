"""Decision-intelligence layer tests: AIPS + recovery + recommendation engine.

Covers the required reference scenarios:
    normal asset / underperforming asset / high anomaly /
    low recovery opportunity / high complexity / critical asset
plus the approved MH-07 documentation scenario.
"""

import pytest

from app.services.aips_service import AIPSInput, calculate_aips
from app.services.recommendation_service import (
    DECISION_SUPPORT_DISCLAIMER,
    generate_recommendations,
)
from app.services.recovery_service import estimate_recovery_opportunity

ALLOWED_ACTIONS = {
    "Monitor asset",
    "Investigate production deviation",
    "Verify operational parameters",
    "Prioritize engineering review",
    "Field verification recommended",
    "Review diagnosis confidence",
    "Assess intervention feasibility and cost",
}


def _full_case(expected, actual, anomaly_score, complexity):
    recovery = estimate_recovery_opportunity(expected, actual, anomaly_score)
    aips = calculate_aips(AIPSInput(
        expected_bbl_d=expected,
        actual_bbl_d=actual,
        anomaly_score=anomaly_score,
        intervention_complexity=complexity,
        recovery=recovery,
    ))
    deviation_pct = (actual - expected) / expected * 100.0
    recs = generate_recommendations(
        deviation_pct=deviation_pct,
        anomaly_score=anomaly_score,
        anomaly_severity="CRITICAL" if anomaly_score >= 0.85 else "ALERT" if anomaly_score >= 0.7 else "WATCH" if anomaly_score >= 0.5 else "NORMAL",
        recovery_opportunity_pct=aips.recovery_opportunity_pct,
        estimated_volume_mmbbl=recovery.estimated_volume_mmbbl,
        combined_confidence=recovery.combined_confidence,
        intervention_complexity=complexity,
        aips_priority=aips.priority,
        asset_id="TEST-1",
    )
    return recovery, aips, recs


# ------------------------------------------------------------ scenario tests
class TestReferenceScenarios:
    def test_normal_asset(self):
        _, aips, recs = _full_case(10_000.0, 9_900.0, 0.10, complexity=0.30)

        assert aips.priority == "LOW"
        assert recs.to_dict()["recommendations"][0]["action"] == "Monitor asset"
        assert all(r.action in ALLOWED_ACTIONS for r in recs.recommendations)

    def test_underperforming_asset(self):
        _, aips, recs = _full_case(12_000.0, 10_200.0, 0.55, complexity=0.40)

        codes = {r.code for r in recs.recommendations}
        assert "INVESTIGATE_DEVIATION" in codes
        assert aips.loss_magnitude_pct == pytest.approx(15.0, abs=1e-6)

    def test_high_anomaly(self):
        recovery, aips, recs = _full_case(10_000.0, 8_000.0, 0.92, complexity=0.50)

        codes = {r.code for r in recs.recommendations}
        assert "VERIFY_OPERATIONAL_PARAMETERS" in codes
        assert recovery.model_confidence == 0.90  # approved tier for >0.85
        assert "PRIORITIZE_ENGINEERING_REVIEW" in codes

    def test_low_recovery_opportunity_suppresses_field_verification(self):
        # Tiny gap despite a strong anomaly signal -> nothing meaningful to recover.
        _, aips, recs = _full_case(10_000.0, 9_960.0, 0.90, complexity=0.40)

        codes = {r.code for r in recs.recommendations}
        assert "FIELD_VERIFICATION_RECOMMENDED" not in codes
        assert aips.recovery.caveat.startswith("Actual recovery depends")

    def test_high_complexity_penalises_and_flags_feasibility(self):
        low_cx_recovery, low_cx_aips, _ = _full_case(10_000.0, 8_500.0, 0.80, complexity=0.20)
        high_cx_recovery, high_cx_aips, recs = _full_case(10_000.0, 8_500.0, 0.80, complexity=0.95)

        codes = {r.code for r in recs.recommendations}
        assert "COMPLEXITY_FEASIBILITY_REVIEW" in codes
        # Identical inputs except complexity: score must drop under the penalty.
        assert high_cx_aips.score < low_cx_aips.score
        assert high_cx_aips.components["complexity"]["contribution"] < 0

    def test_critical_asset(self):
        _, aips, recs = _full_case(1_420_000.0, 1_170_000.0, 0.94, complexity=0.60)

        assert aips.priority == "CRITICAL"
        codes = {r.code for r in recs.recommendations}
        assert {"PRIORITIZE_ENGINEERING_REVIEW", "FIELD_VERIFICATION_RECOMMENDED"} <= codes


# --------------------------------------------------- MH-07 reference scenario
class TestMH07ReferenceScenario:
    """Approved numerical example from docs/CORRECTIONS_SUMMARY_AND_GUIDE.md.

    Expected 1.42 MMBL/d-equivalent, Actual 1.17 -> Loss 17.6%, Anomaly 0.94,
    Complexity 0.60. Doc contributions: 5.28 / 23.5 / 4.94 / -6.0 -> raw 27.72
    scaled to ~92/100 CRITICAL.

    Note: the doc's example recovery input (14.1%) implies historical x model
    ~= 0.80; its own Issue-3 tier definition (0.80 x 0.90 = 0.72) yields
    12.68% instead. The service follows the DEFINITION; both variants are
    asserted below.
    """

    EXPECTED, ACTUAL, ANOMALY, COMPLEXITY = 1_420_000.0, 1_170_000.0, 0.94, 0.60

    def test_definition_based_variant(self):
        recovery = estimate_recovery_opportunity(
            self.EXPECTED, self.ACTUAL, self.ANOMALY, historical_recovery_rate=0.80
        )
        aips = calculate_aips(AIPSInput(
            expected_bbl_d=self.EXPECTED,
            actual_bbl_d=self.ACTUAL,
            anomaly_score=self.ANOMALY,
            intervention_complexity=self.COMPLEXITY,
            recovery=recovery,
        ))

        comps = aips.to_dict()["components"]
        assert comps["loss"]["contribution"] == pytest.approx(5.28, abs=0.01)
        assert comps["anomaly"]["contribution"] == pytest.approx(23.5, abs=0.01)
        assert comps["complexity"]["contribution"] == pytest.approx(-6.0, abs=0.01)
        assert aips.raw_score == pytest.approx(27.22, abs=0.05)
        assert aips.priority == "CRITICAL"
        assert 88 <= aips.score <= 93

    def test_document_example_variant_reproduces_doc_numbers_exactly(self):
        recovery = estimate_recovery_opportunity(
            self.EXPECTED, self.ACTUAL, self.ANOMALY, historical_recovery_rate=0.8889
        )
        aips = calculate_aips(AIPSInput(
            expected_bbl_d=self.EXPECTED,
            actual_bbl_d=self.ACTUAL,
            anomaly_score=self.ANOMALY,
            intervention_complexity=self.COMPLEXITY,
            recovery=recovery,
        ))

        assert aips.raw_score == pytest.approx(27.72, abs=0.02)
        assert aips.score == pytest.approx(92.4, abs=0.2)
        assert aips.priority == "CRITICAL"


# ------------------------------------------------------- language contracts
class TestLanguageContracts:
    def test_recovery_labelled_estimate_not_guarantee(self):
        recovery = estimate_recovery_opportunity(5_000.0, 4_000.0, 0.8)
        d = recovery.to_dict()

        assert d["label"] == "Estimated Recovery Opportunity"
        assert d["caveat"] == (
            "Actual recovery depends on intervention execution, "
            "root-cause verification and reservoir/field conditions."
        )
        assert "guaranteed" not in str(d).lower()
        assert d["methodology"].startswith("Estimated Recovery Opportunity")

    def test_recommendations_are_decision_support_only(self):
        _, aips, recs = _full_case(1_420_000.0, 1_170_000.0, 0.94, complexity=0.60)
        dumped = recs.to_dict()

        assert recs.disclaimer == DECISION_SUPPORT_DISCLAIMER
        assert dumped["disclaimer"] == DECISION_SUPPORT_DISCLAIMER
        text = str(dumped).lower()
        for forbidden in ("perform a workover", "execute intervention", "shut in the well"):
            assert forbidden not in text
        assert all(r.action in ALLOWED_ACTIONS for r in recs.recommendations)

    def test_aips_payload_carries_breakdown_and_disclaimer(self):
        _, aips, _ = _full_case(10_000.0, 8_800.0, 0.75, complexity=0.5)
        d = aips.to_dict()

        assert set(d["components"]) == {"loss", "anomaly", "recovery", "complexity"}
        assert d["recovery_caveat"].startswith("Actual recovery depends")
        assert "single source of truth" in d["disclaimer"]

    def test_recommendation_set_shape(self):
        recs = generate_recommendations(
            deviation_pct=-16.0,
            anomaly_score=0.94,
            anomaly_severity="CRITICAL",
            recovery_opportunity_pct=11.3,
            estimated_volume_mmbbl=0.18,
            combined_confidence=0.85,
            intervention_complexity=0.6,
            aips_priority="CRITICAL",
            asset_id="MH-07",
        ).to_dict()

        assert recs["asset_id"] == "MH-07"
        assert recs["recommendations"]
        for item in recs["recommendations"]:
            assert {"code", "action", "rationale", "priority"} <= set(item)
        assert "lead action" in recs["summary"]
