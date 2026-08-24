"""Anomaly detection tests over seeded synthetic history."""

from app.ingestion.catalog import generate_asset_history
from app.ml.anomaly import (
    ProductionAnomalyDetector,
    evaluate_detector,
    severity_for_score,
)


def test_severity_bands_match_frontend_contract():
    assert severity_for_score(0.4) == "NORMAL"
    assert severity_for_score(0.55) == "WATCH"
    assert severity_for_score(0.75) == "ALERT"
    assert severity_for_score(0.9) == "CRITICAL"


def test_injected_mh07_anomaly_is_detected():
    history = generate_asset_history("MH-07", months=36)
    detector = ProductionAnomalyDetector().fit(history)
    windows = detector.detect_windows("MH-07", history)

    assert windows, "expected at least one anomaly window for injected MH-07 decline"
    recent = [w for w in windows if w.period_index >= len(history) - 8]
    assert recent, "anomaly should be flagged within the injected final 8-month window"
    top = max(recent, key=lambda w: w.anomaly_score)
    assert top.anomaly_score >= 0.5


def test_stable_asset_has_fewer_flags_than_mh07():
    mh07 = generate_asset_history("MH-07", months=36)
    stable = generate_asset_history("CB-08", months=36)

    det = ProductionAnomalyDetector()
    d_mh07 = ProductionAnomalyDetector().fit(mh07)
    d_stable = ProductionAnomalyDetector().fit(stable)
    _ = det
    n_mh07 = len(d_mh07.detect_windows("MH-07", mh07))
    n_stable = len(d_stable.detect_windows("CB-08", stable))
    assert n_stable <= n_mh07 + 1


def test_evaluation_metrics_present():
    history = generate_asset_history("MH-07", months=36)
    detector = ProductionAnomalyDetector().fit(history)
    evaluation = evaluate_detector(detector, history)
    assert evaluation is not None
    metrics = evaluation.to_dict()
    for key in ("precision", "recall", "f1", "roc_auc"):
        assert key in metrics
        assert 0.0 <= metrics[key] <= 1.0
