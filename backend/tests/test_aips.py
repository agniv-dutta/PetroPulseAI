"""AIPS formula-parity tests (contract with frontend aipsCalculator.ts)."""

from app.intelligence.aips import AIPSInput, calculate_aips, priority_for_score


def test_formula_matches_frontend_contract():
    inp = AIPSInput(
        expected_bbl_d=12500.0,
        actual_bbl_d=10500.0,
        anomaly_score=0.9,
        recovery_gap_pct=16.0,
        combined_confidence=0.82,
        complexity=0.5,
    )
    out = calculate_aips(inp)

    loss_pct = abs(12500 - 10500) / 12500 * 100          # 16.0
    loss_norm = min(loss_pct / 18.0 * 100, 100)          # 88.89
    anomaly_norm = 90.0
    rec_raw = 16.0 * 0.82                                # 13.12
    rec_norm = min(rec_raw / 15.0 * 100, 100)            # 87.47
    expected = max(0.35 * loss_norm + 0.25 * anomaly_norm + 0.40 * rec_norm - 0.10 * 50, 0)

    assert abs(out.score - expected) < 0.01
    assert out.priority == priority_for_score(out.score)


def test_score_clamped_and_bands():
    zero = calculate_aips(AIPSInput(
        expected_bbl_d=100, actual_bbl_d=100,
        anomaly_score=0.0, recovery_gap_pct=0.0,
        combined_confidence=0.5, complexity=1.0,
    ))
    assert zero.score == 0.0
    assert zero.priority == "LOW"

    extreme = calculate_aips(AIPSInput(
        expected_bbl_d=100, actual_bbl_d=0,
        anomaly_score=1.0, recovery_gap_pct=50,
        combined_confidence=1.0, complexity=0.0,
    ))
    assert extreme.score <= 100.0
    assert extreme.priority == "CRITICAL"


def test_recovery_estimate_consistency():
    from app.intelligence.recovery import estimate_recovery

    rec = estimate_recovery(12000, 9000, 0.95)
    assert rec.gap_bbl_d == 3000
    assert abs(rec.loss_volume_mmbbl_12m - 1.095) < 0.01
    assert rec.estimated_recovery_mmbbl < rec.loss_volume_mmbbl_12m
    assert rec.confidence_tier == "HIGH"
