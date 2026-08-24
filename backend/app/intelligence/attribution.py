"""SHAP-based deviation attribution for the production forecaster."""

import numpy as np
import shap

from app.ml.forecast import ProductionForecaster

LABELS = {
    "lag_1": "Recent production level",
    "lag_2": "Two-month production",
    "lag_3": "Quarter-lag production",
    "lag_6": "Half-year production",
    "lag_12": "Year-lag production",
    "roll3_mean": "3-month rolling average",
    "roll6_mean": "6-month rolling average",
    "pct_change_1": "Month-over-month momentum",
    "sin12": "Seasonal cycle",
    "cos12": "Seasonal cycle (cos)",
}


def attribute_deviation(
    forecaster: ProductionForecaster,
    history_values: list[float],
    expected_last: float,
    actual_last: float,
) -> dict:
    """Explain the latest observed gap between actual and model-expected output.

    Uses TreeExplainer on the GBM; SHAP values for the most recent feature
    vector are mapped to human-readable drivers and normalised to shares.
    """
    if not forecaster._fitted:
        raise RuntimeError("forecaster must be fitted before attribution")

    x = forecaster._feature_vector(list(history_values), len(history_values) - 1).reshape(1, -1)
    explainer = shap.TreeExplainer(forecaster.model)
    sv = explainer.shap_values(x)[0]

    gap = actual_last - expected_last
    abs_sv = np.abs(sv)
    denom = float(abs_sv.sum())
    shares = abs_sv / (denom if denom > 1e-12 else 1.0)

    contributions = []
    for i, name in enumerate(forecaster.feature_names):
        direction = "up" if sv[i] >= 0 else "down"
        contributions.append({
            "feature": name,
            "label": LABELS.get(name, name),
            "shap_value": round(float(sv[i]), 3),
            "share_pct": round(float(shares[i]) * 100.0, 1),
            "direction": direction,
        })
    contributions.sort(key=lambda c: -c["share_pct"])

    return {
        "expected_bbl_d": round(float(expected_last), 1),
        "actual_bbl_d": round(float(actual_last), 1),
        "gap_bbl_d": round(float(gap), 1),
        "base_value": round(float(explainer.expected_value[0]
                                  if isinstance(explainer.expected_value, (list, np.ndarray))
                                  else explainer.expected_value), 1),
        "contributions": contributions[:6],
        "note": (
            "Model-estimated feature attribution. SHAP values explain the "
            "model's prediction, not physical causality."
        ),
    }
