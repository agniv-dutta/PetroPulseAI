"""Model 4 - SHAP explanations for supported supervised models.

Produces "Model-Estimated Feature Contributions" for the production
forecaster. Each contribution carries:

    feature, current value, baseline, SHAP value, direction,
    relative contribution (%)

Language policy (hard requirement):
    - Terminology is ALWAYS "Model-Estimated Feature Contributions".
    - NEVER described as "Verified Root Cause".
    - Every explanation ships the caveat below.

Supported backends: XGBoost / scikit-learn tree ensembles via
shap.TreeExplainer. Unsupported models fall back to a permutation-style
approximation and say so explicitly.
"""

from __future__ import annotations

import numpy as np

from app.ml.forecast import build_supervised_matrix

TERMINOLOGY = "Model-Estimated Feature Contributions"
CAVEAT = (
    "SHAP indicates patterns learned by the model and does not establish "
    "physical causality."
)

FEATURE_LABELS = {
    "lag_1": "Previous month production",
    "lag_2": "Production two months ago",
    "lag_3": "Quarter-lag production",
    "lag_6": "Half-year-lag production",
    "lag_12": "Year-lag production",
    "roll3_mean": "3-month rolling average",
    "roll6_mean": "6-month rolling average",
    "roll3_std": "3-month production volatility",
    "decline_rate": "Month-over-month decline rate",
    "trend_slope": "6-month trend slope",
    "sin12": "Seasonal cycle (sin)",
    "cos12": "Seasonal cycle (cos)",
    "arps_baseline": "Arps baseline expectation",
}


def _label(feature: str) -> str:
    if feature.startswith("meta_"):
        return f"Asset metadata: {feature[5:].replace('_', ' ')}"
    return FEATURE_LABELS.get(feature, feature)


def explain_instance(
    model,
    x_row: np.ndarray,
    feature_names: list[str],
    background: np.ndarray | None = None,
) -> dict:
    """SHAP values (or permutation fallback) for a single instance."""
    x = np.asarray(x_row, dtype=float).reshape(1, -1)
    try:
        import shap

        explainer = shap.TreeExplainer(model)
        shap_values = np.asarray(explainer.shap_values(x))[0]
        expected_value = explainer.expected_value
        if isinstance(expected_value, (list, np.ndarray)):
            expected_value = float(np.asarray(expected_value).ravel()[0])
        method = "shap-tree-explainer"
    except Exception:
        # Fallback: mean-ablation contribution over a background sample.
        shap_values, expected_value, method = _ablation_contributions(
            model, x, background
        )

    abs_sv = np.abs(shap_values)
    denom = float(abs_sv.sum())
    shares = abs_sv / denom * 100.0 if denom > 1e-12 else np.zeros_like(abs_sv)

    contributions = []
    for i, name in enumerate(feature_names):
        contributions.append({
            "feature": name,
            "label": _label(name),
            "value": float(x[0, i]),
            "baseline": round(float(expected_value), 3),
            "shap_value": round(float(shap_values[i]), 3),
            "direction": "UPWARD" if shap_values[i] >= 0 else "DOWNWARD",
            "relative_contribution_pct": round(float(shares[i]), 1),
            "share_pct": round(float(shares[i]), 1),  # legacy alias
        })
    contributions.sort(key=lambda c: -c["relative_contribution_pct"])

    return {
        "base_value": round(float(expected_value), 3),
        "method": method,
        "contributions": contributions,
    }


def _ablation_contributions(model, x: np.ndarray, background: np.ndarray | None):
    """Mean-ablation approximation used only when SHAP cannot run."""
    if background is None or len(background) == 0:
        zeros = np.zeros(x.shape[1])
        return zeros, float(model.predict(x)[0]) if hasattr(model, "predict") else 0.0, "unavailable"

    bg = background[np.random.default_rng(42).choice(
        len(background), size=min(len(background), 64), replace=False
    )]
    base_pred = float(np.mean(model.predict(bg)))
    shap_values = np.zeros(x.shape[1])
    for j in range(x.shape[1]):
        modified = bg.copy()
        modified[:, j] = x[0, j]
        shap_values[j] = float(np.mean(model.predict(modified))) - base_pred
    return shap_values, base_pred, "mean-ablation-fallback"


def attribute_deviation(
    forecaster,
    history_values: list[float],
    expected_last: float,
    actual_last: float,
) -> dict:
    """Explain the latest observed gap between actual and model-expected output.

    Returns Model-Estimated Feature Contributions for the most recent feature
    vector. These are statistical attributions of the MODEL's behaviour - not
    verified physical root causes.
    """
    if not getattr(forecaster, "_fitted", False):
        raise RuntimeError("forecaster must be fitted before attribution")

    month_index = max(len(history_values) - 1, 0)
    x = forecaster._vector(list(history_values), month_index).reshape(1, -1)

    background = None
    try:
        background, _, _ = build_supervised_matrix(
            history_values, forecaster.arps_params_, forecaster.metadata_
        )
    except ValueError:
        pass

    explained = explain_instance(
        forecaster.model, x, forecaster.feature_names, background=background
    )

    gap = actual_last - expected_last
    return {
        "terminology": TERMINOLOGY,
        "caveat": CAVEAT,
        "expected_bbl_d": round(float(expected_last), 1),
        "actual_bbl_d": round(float(actual_last), 1),
        "gap_bbl_d": round(float(gap), 1),
        "base_value": explained["base_value"],
        "explainer_method": explained["method"],
        "contributions": explained["contributions"][:6],
        "disclaimer": (
            f"{TERMINOLOGY} derived from the trained forecasting ensemble. "
            f"{CAVEAT}"
        ),
    }
