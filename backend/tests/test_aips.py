"""AIPS formula-parity tests against the APPROVED backend definition.

Approved formula (docs/CORRECTIONS_SUMMARY_AND_GUIDE.md, Issue 2):
    AIPS = 0.30*Loss_Magnitude + 0.25*Anomaly_Severity
         + 0.35*Recovery_Opportunity - 0.10*Intervention_Complexity

The backend service is the single source of truth; the frontend must render
its breakdown rather than compute its own score.
"""

import pytest

from app.services.aips_service import (
    AIPS_WEIGHTS,
    AIPSPriorityThresholds,
    AIPSInput,
    calculate_aips,
    priority_for_score,
)
from app.services.recovery_service import estimate_recovery_opportunity


def _make(expected, actual, anomaly_score, complexity=0.5, hist_rate=0.80):
    recovery = estimate_recovery_opportunity(
        expected, actual, anomaly_score, historical_recovery_rate=hist_rate
    )
    return recovery, calculate_aips(AIPSInput(
        expected_bbl_d=expected,
        actual_bbl_d=actual,
        anomaly_score=anomaly_score,
        intervention_complexity=complexity,
        recovery=recovery,
    ))


def test_approved_weights():
    assert AIPS_WEIGHTS == {"loss": 0.30, "anomaly": 0.25, "recovery": 0.35, "complexity": -0.10}
    assert abs(sum(AIPS_WEIGHTS.values()) - 0.80) < 1e-9


def test_loss_magnitude_is_absolute_and_positive():
    _, underperformer = _make(1_000.0, 800.0, 0.6)
    _, overperformer = _make(1_000.0, 1_200.0, 0.6)
    assert underperformer.loss_magnitude_pct == pytest.approx(20.0, abs=1e-6)
    # Over-performance must NOT produce negative loss (the old bug).
    assert overperformer.loss_magnitude_pct == pytest.approx(20.0, abs=1e-6)


def test_component_contributions_arithmetic():
    recovery, result = _make(1_420_000.0, 1_170_000.0, 0.94, complexity=0.60, hist_rate=0.80)
    comps = result.to_dict()["components"]
    loss_pct = abs(1_420_000 - 1_170_000) / 1_420_000 * 100

    assert comps["loss"]["contribution"] == pytest.approx(round(loss_pct * 0.30, 2))
    assert comps["anomaly"]["contribution"] == pytest.approx(round(0.94 * 25.0, 2))
    assert comps["recovery"]["contribution"] == pytest.approx(
        round(result.recovery_opportunity_pct * 0.35, 2)
    )
    assert comps["complexity"]["contribution"] == pytest.approx(-6.0)
    # Recovery opportunity follows the approved volume formula (percentage form).
    expected_rec_pct = loss_pct * 0.80 * 0.90
    assert result.recovery_opportunity_pct == pytest.approx(expected_rec_pct, abs=1e-6)


def test_score_clamped_and_priority_bands():
    _, flat = _make(1_000.0, 1_000.0, 0.0, complexity=1.0)
    assert flat.score == 0.0
    assert flat.priority == "LOW"

    _, extreme = _make(1_000.0, 400.0, 1.0, complexity=0.0)
    assert 0.0 <= extreme.score <= 100.0
    assert extreme.priority == "CRITICAL"


def test_priority_thresholds_are_configuration_driven(monkeypatch):
    from types import SimpleNamespace

    import app.services.aips_service as svc

    monkeypatch.setattr(
        svc,
        "get_settings",
        lambda: SimpleNamespace(aips_priority_thresholds={
            "CRITICAL": 90.0, "HIGH": 75.0, "MEDIUM": 50.0,
        }),
    )
    assert priority_for_score(91) == "CRITICAL"
    assert priority_for_score(80) == "HIGH"
    assert priority_for_score(60) == "MEDIUM"
    assert priority_for_score(10) == "LOW"


def test_recovery_estimate_contract_and_labels():
    rec = estimate_recovery_opportunity(10_000.0, 8_500.0, anomaly_score=0.95)
    d = rec.to_dict()

    for key in ("estimated_volume", "confidence", "historical_success_rate",
                "model_confidence", "combined_confidence"):
        assert key in d
    # Volume formula: current loss x historical rate x model confidence.
    loss_volume_mmbbl = 1_500.0 * 365 / 1e6
    assert d["estimated_volume"] == pytest.approx(loss_volume_mmbbl * 0.80 * 0.90, abs=1e-3)
    assert d["confidence"] == d["combined_confidence"]
    assert d["label"] == "Estimated Recovery Opportunity"
    assert d["caveat"] == (
        "Actual recovery depends on intervention execution, "
        "root-cause verification and reservoir/field conditions."
    )
    dumped = str(d).lower()
    assert "guaranteed" not in dumped


def test_model_confidence_tiers_match_approved_mapping():
    from app.services.recovery_service import model_confidence_for_anomaly

    assert model_confidence_for_anomaly(0.86) == 0.90
    assert model_confidence_for_anomaly(0.75) == 0.75
    assert model_confidence_for_anomaly(0.40) == 0.60


def test_intelligence_shims_delegate_to_service():
    from app.intelligence.aips import calculate_aips as shim_calc
    from app.intelligence.recovery import estimate_recovery as shim_recovery

    assert shim_calc is calculate_aips
    assert shim_recovery is estimate_recovery_opportunity


def test_thresholds_object_bands():
    t = AIPSPriorityThresholds(critical=80, high=60, medium=40)
    assert t.for_score(85) == "CRITICAL"
    assert t.for_score(80) == "CRITICAL"
    assert t.for_score(65) == "HIGH"
    assert t.for_score(45) == "MEDIUM"
    assert t.for_score(10) == "LOW"
