"""Tests for the PetroPulse AI ML engine.

Covers Model 1 (Arps), Model 2 (Arps + XGBoost/LSTM ensemble with
chronological validation), Model 3 (Isolation Forest with configurable
severity thresholds) and Model 4 (SHAP model-estimated feature contributions).
"""

import json

import numpy as np
import pandas as pd
import pytest

from app.ml.anomaly import (
    DEFAULT_SEVERITY_THRESHOLDS,
    ProductionAnomalyDetector,
    build_feature_frame,
    severity_for_score,
)
from app.ml.arps import (
    arps_rate,
    calculate_decline_rate,
    fit_arps,
    forecast_arps,
    predict_arps,
)
from app.ml.forecast import LSTMForecaster, ProductionForecaster
from app.ml.performance_metrics import PerformanceMetrics


# ----------------------------------------------------------------- helpers
def _arps_series(qi=5000.0, di=0.05, b=0.6, months=36, noise=0.01, seed=3):
    rng = np.random.default_rng(seed)
    t = np.arange(months, dtype=float)
    return (arps_rate(qi, di, b, t) * (1 + rng.normal(0, noise, months))).tolist(), t


@pytest.fixture()
def arps_params():
    vals, _ = _arps_series()
    fit = fit_arps(vals)
    return {"qi": fit.qi, "di": fit.di, "b": fit.b}


# ------------------------------------------------------------- Model 1: Arps
class TestArpsModel:
    def test_formula_matches_spec(self):
        qi, di, b = 2000.0, 0.04, 0.5
        t = 12.0
        expected = qi / ((1 + b * di * t) ** (1.0 / b))
        assert abs(float(predict_arps((qi, di, b), [t])[0]) - expected) < 1e-6

    def test_fit_returns_required_contract(self):
        vals, _ = _arps_series()
        result = fit_arps(vals)
        d = result.to_dict()

        for key in ("qi", "di", "b", "r_squared", "mae", "confidence",
                    "forecast_30d", "forecast_90d", "forecast_180d", "forecast_365d"):
            assert key in d
        assert set(d["residuals"]) == {"mean", "std", "max_abs", "bias_pct"}
        assert result.n_observations == 36

    def test_parameter_bounds_respected(self):
        # Extreme decline request must clamp inside configured bounds.
        vals = [10000.0 * (0.5 ** i) for i in range(12)]
        result = fit_arps(vals)
        from app.ml.arps import B_MAX, B_MIN, DI_MAX, DI_MIN

        assert DI_MIN <= result.di <= DI_MAX
        assert B_MIN <= result.b <= B_MAX

    def test_requires_minimum_history(self):
        with pytest.raises(ValueError):
            fit_arps([100.0] * 4)

    def test_rejects_non_positive_production(self):
        with pytest.raises(ValueError):
            fit_arps([100.0, 95.0, 0.0, 90.0, 88.0, 85.0, 80.0, 78.0, 76.0])
        with pytest.raises(ValueError):
            fit_arps([100.0] * 7 + [-5.0])

    def test_forecasts_decline_monotonically(self):
        vals, _ = _arps_series(di=0.06, seed=5)
        f = forecast_arps(fit_arps(vals))
        assert f["forecast_30d"] >= f["forecast_90d"] >= f["forecast_180d"] >= f["forecast_365d"]

    def test_confidence_in_valid_range_and_rewarded_for_goodness_of_fit(self):
        clean_vals = list(arps_rate(4000.0, 0.04, 0.6, np.arange(24.0)))
        noisy_vals, _ = _arps_series(noise=0.20, seed=9)

        good = fit_arps(clean_vals).confidence
        bad = fit_arps(noisy_vals).confidence
        assert 0.0 <= bad <= good <= 0.99
        assert good > bad

    def test_calculate_decline_rate_contract(self):
        d = calculate_decline_rate(di=0.05, b=0.6, t_months=12)
        expected_nominal = 0.05 / (1 + 0.6 * 0.05 * 12)
        assert abs(d["nominal_decline_per_month"] - round(expected_nominal, 6)) < 1e-9
        assert d["decline_pct_per_month"] > 0
        assert 0 < d["effective_decline_pct_per_year"] < 100

    def test_low_fit_quality_is_flagged(self):
        rng = np.random.default_rng(11)
        flat_noisy = (2500 - 10 * np.arange(24) + rng.normal(0, 300, 24)).tolist()
        result = fit_arps(flat_noisy)
        assert any("cautious" in w for w in result.warnings)


# ------------------------------------------- Model 2: forecast ensemble
class TestForecastEnsemble:
    def test_forecast_exposes_what_produced_it(self, arps_params):
        vals, _ = _arps_series()
        forecaster = ProductionForecaster(random_state=42)
        forecaster.fit(
            vals,
            arps_params=arps_params,
            asset_metadata={"intervention_cost_usd_m": 1.2},
        )
        fc = forecaster.forecast(horizon_days=90)

        assert fc["models_used"][0] == "arps"
        assert fc["backend"] in ("xgboost", "sklearn-gradient-boosting")
        assert fc["produced_by"].upper().startswith("ARPS")
        assert fc["arps_anchor_used"] is True
        assert len(fc["points"]) == 3  # 90 days ~ 3 monthly steps
        point = fc["points"][0]
        assert point["lower"] <= point["forecast"] <= point["upper"]
        for key in ("forecast_30d", "forecast_90d", "forecast_180d", "forecast_365d"):
            assert key in fc["summary"]

    def test_metadata_features_enter_the_matrix(self, arps_params):
        vals, _ = _arps_series(months=40)
        forecaster = ProductionForecaster().fit(
            vals, arps_params=arps_params, asset_metadata={"onstream_year": 1994}
        )
        assert "meta_onstream_year" in forecaster.feature_names
        assert "arps_baseline" in forecaster.feature_names

    def test_chronological_backtest_horizon_metrics(self, arps_params):
        vals, _ = _arps_series(months=36)
        forecaster = ProductionForecaster(random_state=42).fit(vals, arps_params=arps_params)
        bt = forecaster.backtest(vals, horizons_days=(30, 90, 180), arps_params=arps_params)

        assert set(bt) >= {"30d", "90d", "180d", "overall"}
        for key in ("30d", "90d", "180d"):
            metrics = bt[key]
            for m in ("mae", "rmse", "mape", "r2"):
                assert m in metrics
            assert metrics["folds"] >= 1 and np.isfinite(metrics["mae"])
        assert bt["overall"]["mae"] >= 0

    def test_fallback_backend_when_xgboost_unavailable(self, arps_params, monkeypatch):
        import app.ml.forecast as fc_module

        from sklearn.ensemble import GradientBoostingRegressor

        def _sklearn_only(_rs=42):
            return GradientBoostingRegressor(n_estimators=50, random_state=_rs), \
                "sklearn-gradient-boosting"

        monkeypatch.setattr(fc_module, "_make_boosted_model", _sklearn_only)
        vals, _ = _arps_series(months=30)
        fc = ProductionForecaster().fit(vals, arps_params=arps_params).forecast(horizon_days=30)
        assert fc["backend"] == "sklearn-gradient-boosting"
        assert "xgboost" not in fc["models_used"]
        assert fc["points"], "fallback must still produce a usable forecast"

    @pytest.mark.skipif(
        not LSTMForecaster.torch_available(),
        reason="pytorch not installed - fallback path asserted instead",
    )
    def test_lstm_active_when_enabled_with_enough_data(self, arps_params):
        vals, _ = _arps_series(months=60, noise=0.005)
        forecaster = ProductionForecaster(enable_lstm=True).fit(vals, arps_params=arps_params)
        fc = forecaster.forecast(horizon_days=90)
        assert "lstm" in fc["models_used"]

    def test_lstm_gracefully_falls_back_without_torch_or_data(self, arps_params):
        vals, _ = _arps_series(months=36)
        forecaster = ProductionForecaster(random_state=42)
        forecaster.fit(vals, arps_params=arps_params, enable_lstm=True)
        fc = forecaster.forecast(horizon_days=60)

        if not LSTMForecaster.torch_available():
            assert "lstm" not in fc["models_used"]
            assert any("pytorch" in note.lower() for note in forecaster.fallback_notes)
        else:
            # torch present but history too short must still fall back cleanly
            assert any("insufficient" in note.lower() for note in forecaster.fallback_notes)
        assert fc["points"], "fallback must remain functional"

    def test_insufficient_history_raises_cleanly(self):
        with pytest.raises(ValueError):
            ProductionForecaster().fit([10.0] * 8)


# --------------------------------------- Model 3: Isolation Forest detector
def _history_rows(months=36, inject_anomaly=True, operational=False):
    rng = np.random.default_rng(42)
    rows = []
    start = pd.Timestamp("2023-01-01")
    for i in range(months):
        expected = 5000.0 * (1 - 0.03) ** i
        actual = expected * (1 + rng.normal(0, 0.02))
        if inject_anomaly and i >= months - 6:
            actual *= 0.85
        row = {
            "period": str((start + pd.DateOffset(months=i)).date()),
            "oil_bbl_d": actual,
            "expected_bbl_d": expected,
        }
        if operational:
            row.update({"pressure": 150 + rng.normal(0, 2), "temperature": 80.0})
        rows.append(row)
    return rows


class TestIsolationForestDetector:
    def test_spec_feature_set_used(self):
        feats, names = build_feature_frame(_history_rows())
        assert set(names) == {
            "production", "production_deviation", "rolling_mean",
            "rolling_std", "decline_rate",
        }
        assert list(feats.columns) == names

    def test_operational_features_only_when_genuinely_present(self):
        _, without = build_feature_frame(_history_rows())
        _, with_ops = build_feature_frame(_history_rows(operational=True))
        assert all(not n.endswith("_z") for n in without)
        assert "pressure_z" in with_ops and "temperature_z" in with_ops

        sparse = [{**r, "pressure": (150.0 if i < 3 else None)}
                  for i, r in enumerate(_history_rows(operational=False))]
        _, sparse_names = build_feature_frame(sparse[:20])
        assert "pressure_z" not in sparse_names, "low coverage must exclude the field"

    def test_injected_anomaly_detected_with_default_thresholds(self):
        rows = _history_rows()
        detector = ProductionAnomalyDetector().fit(rows)
        windows = detector.detect_windows("T-1", rows)
        assert windows
        recent = [w for w in windows if w.period_index >= len(rows) - 6]
        assert recent and max(w.anomaly_score for w in recent) >= 0.5
        top = max(recent, key=lambda w: w.anomaly_score)
        assert top.severity in ("WATCH", "ALERT", "CRITICAL")

    def test_severity_thresholds_configurable(self):
        custom = [(0.60, "CRITICAL"), (0.40, "ALERT"), (0.20, "WATCH")]
        assert severity_for_score(0.65, custom) == "CRITICAL"
        assert severity_for_score(0.45, custom) == "ALERT"
        assert severity_for_score(0.25, custom) == "WATCH"
        assert severity_for_score(0.10, custom) == "NORMAL"

        rows = _history_rows()
        detector = ProductionAnomalyDetector(severity_thresholds=custom).fit(rows)
        windows = detector.detect_windows("T-1", rows)
        for w in windows:
            expected_band = severity_for_score(w.anomaly_score, custom)
            assert w.severity == expected_band

    def test_explanations_are_model_estimated_not_root_cause(self):
        rows = _history_rows()
        windows = ProductionAnomalyDetector().fit(rows).detect_windows("T-1", rows)
        assert windows
        assert all(
            "model-estimated" in w.explanation.lower()
            and "not a verified physical root cause" in w.explanation.lower()
            for w in windows
        )

    def test_evaluation_metrics_present(self):
        rows = _history_rows()
        detector = ProductionAnomalyDetector().fit(rows)
        evaluation = __import__(
            "app.ml.anomaly", fromlist=["evaluate_detector"]
        ).evaluate_detector(detector, rows)
        assert evaluation is not None
        metrics = evaluation.to_dict()
        for key in ("precision", "recall", "f1", "roc_auc"):
            assert 0.0 <= metrics[key] <= 1.0


# ---------------------------------------------------- Model 4: SHAP layer
class TestShapAttribution:
    def _forecaster(self, arps_params, months=36):
        vals, _ = _arps_series(months=months)
        return ProductionForecaster(random_state=42).fit(vals, arps_params=arps_params)

    def test_contribution_schema_complete(self, arps_params):
        from app.intelligence.attribution import attribute_deviation

        vals, _ = _arps_series()
        forecaster = self._forecaster(arps_params)
        attribution = attribute_deviation(forecaster, vals, vals[-1] * 1.02, vals[-1])

        required = {"feature", "value", "baseline", "shap_value",
                    "direction", "relative_contribution_pct"}
        for c in attribution["contributions"]:
            assert required <= set(c)
            assert c["direction"] in ("UPWARD", "DOWNWARD")
            assert 0.0 <= c["relative_contribution_pct"] <= 100.0
        shares = sum(c["relative_contribution_pct"] for c in attribution["contributions"])
        assert shares <= 100.5

    def test_terminology_and_caveat_policy(self, arps_params):
        from app.intelligence.attribution import CAVEAT, TERMINOLOGY, attribute_deviation

        assert TERMINOLOGY == "Model-Estimated Feature Contributions"
        assert CAVEAT.startswith("SHAP indicates patterns learned by the model")

        vals, _ = _arps_series()
        attribution = attribute_deviation(
            self._forecaster(arps_params), vals, vals[-1], vals[-1]
        )
        assert attribution["terminology"] == TERMINOLOGY
        assert attribution["caveat"] == CAVEAT
        dumped = json.dumps(attribution)
        assert "Verified Root Cause" not in dumped
        assert "root cause" not in dumped.lower().replace(
            "does not establish physical causality", ""
        )

    def test_shap_method_used_for_supported_models(self, arps_params):
        from app.intelligence.attribution import attribute_deviation

        vals, _ = _arps_series()
        forecaster = self._forecaster(arps_params)
        attribution = attribute_deviation(forecaster, vals, vals[-1], vals[-1])
        assert attribution["explainer_method"] in ("shap-tree-explainer", "mean-ablation-fallback")
        if forecaster.backend in ("xgboost", "sklearn-gradient-boosting"):
            assert attribution["explainer_method"] == "shap-tree-explainer"


# ------------------------------------------------------ performance metrics
class TestPerformanceMetrics:
    def test_zero_safe_mape_stays_finite(self):
        metrics = PerformanceMetrics.regression_metrics([0.0, 1.0, 2.0], [0.1, 1.1, 1.9])
        assert np.isfinite(metrics["mape"])
        for key in ("mae", "rmse", "r2", "mape"):
            assert key in metrics
