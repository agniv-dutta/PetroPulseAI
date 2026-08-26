"""Unit tests for individual functions and classes.

Covers:
    - Arps equation (analytic verification, exponential limit)
    - Arps fitting (parameter recovery, bounds, minimum history)
    - Decline rate calculation
    - Feature engineering (build_feature_frame)
    - Synthetic generator (scenarios, determinism, provenance)
    - Anomaly detector (severity bands, scoring, window detection)
    - AIPS (formula, weights, clamping, priority bands)
    - Recovery opportunity (tiers, volume formula, labels)
    - SHAP formatting (terminology, contribution schema)
    - Recommendation engine (action codes, disclaimer, language rules)
"""

import numpy as np
import pandas as pd
import pytest


# ------------------------------------------------------------------ Arps


class TestArpsEquation:
    def test_exponential_limit_b_near_zero(self):
        from app.ml.arps import arps_rate
        qi, di, t = 5000.0, 0.04, np.arange(36.0)
        b_tiny = 1e-6
        hyper = arps_rate(qi, di, b_tiny, t)
        exp = qi * np.exp(-di * t)
        np.testing.assert_allclose(hyper, exp, rtol=1e-4)

    def test_hyperbolic_exact_value(self):
        from app.ml.arps import predict_arps
        qi, di, b = 2000.0, 0.04, 0.5
        t = 12.0
        expected = qi / ((1 + b * di * t) ** (1.0 / b))
        result = float(predict_arps((qi, di, b), [t])[0])
        assert abs(result - expected) < 1e-6

    def test_harmonic_b_equals_1(self):
        from app.ml.arps import arps_rate
        qi, di = 3000.0, 0.05
        t = np.array([0.0, 6.0, 12.0, 24.0])
        result = arps_rate(qi, di, 1.0, t)
        expected = qi / (1.0 + di * t)
        np.testing.assert_allclose(result, expected, rtol=1e-9)

    def test_rate_at_t_zero_equals_qi(self):
        from app.ml.arps import arps_rate
        assert arps_rate(8000.0, 0.03, 0.5, np.array([0.0]))[0] == pytest.approx(8000.0)

    def test_rate_monotonically_decreasing(self):
        from app.ml.arps import arps_rate
        rates = arps_rate(10000.0, 0.04, 0.6, np.arange(60.0))
        assert all(rates[i] >= rates[i + 1] for i in range(len(rates) - 1))


class TestArpsFitting:
    def test_recovers_known_params(self):
        from app.ml.arps import fit_arps
        qi, di, b = 5000.0, 0.04, 0.6
        t = np.arange(36.0)
        values = (qi / (1 + b * di * t) ** (1.0 / b)).tolist()
        result = fit_arps(values)
        assert result.qi == pytest.approx(qi, rel=0.05)
        assert result.di == pytest.approx(di, rel=0.10)
        assert result.b == pytest.approx(b, rel=0.15)
        assert result.r_squared > 0.99

    def test_fit_result_to_dict_has_all_keys(self):
        from app.ml.arps import fit_arps
        values, _ = _arps_series()
        result = fit_arps(values)
        d = result.to_dict()
        for key in ("model", "qi", "di", "b", "r_squared", "mae", "confidence",
                     "forecast_30d", "forecast_90d", "forecast_180d", "forecast_365d",
                     "decline_rate_current_pct_per_month", "residuals", "warnings"):
            assert key in d, f"missing key: {key}"
        assert d["model"] == "arps-hyperbolic"

    def test_minimum_history_enforced(self):
        from app.ml.arps import fit_arps
        with pytest.raises(ValueError, match="at least 6"):
            fit_arps([100.0] * 5)

    def test_rejects_non_positive(self):
        from app.ml.arps import fit_arps
        with pytest.raises(ValueError, match="positive"):
            fit_arps([100.0, 95.0, 0.0, 90.0, 88.0, 85.0])

    def test_rejects_infinite(self):
        from app.ml.arps import fit_arps
        with pytest.raises(ValueError, match="finite"):
            fit_arps([100.0, 95.0, float("inf"), 90.0, 88.0, 85.0])

    def test_r_squared_bounded(self):
        from app.ml.arps import fit_arps
        values, _ = _arps_series()
        result = fit_arps(values)
        assert 0.0 <= result.r_squared <= 1.0

    def test_confidence_bounded(self):
        from app.ml.arps import fit_arps
        values, _ = _arps_series()
        result = fit_arps(values)
        assert 0.0 <= result.confidence <= 0.99


class TestDeclineRate:
    def test_nominal_formula(self):
        from app.ml.arps import calculate_decline_rate
        d = calculate_decline_rate(di=0.05, b=0.6, t_months=12)
        expected = 0.05 / (1 + 0.6 * 0.05 * 12)
        assert d["nominal_decline_per_month"] == pytest.approx(expected, abs=1e-6)

    def test_exponential_limit(self):
        from app.ml.arps import calculate_decline_rate
        d = calculate_decline_rate(di=0.04, b=1e-6, t_months=0)
        assert d["nominal_decline_per_month"] == pytest.approx(0.04, abs=1e-3)

    def test_decline_pct_positive(self):
        from app.ml.arps import calculate_decline_rate
        d = calculate_decline_rate(di=0.05, b=0.6, t_months=6)
        assert d["decline_pct_per_month"] > 0

    def test_effective_yearly_bounded(self):
        from app.ml.arps import calculate_decline_rate
        d = calculate_decline_rate(di=0.9, b=0.9, t_months=0)
        assert 0 < d["effective_decline_pct_per_year"] < 100

    def test_clamping_di_bounds(self):
        from app.ml.arps import calculate_decline_rate
        d = calculate_decline_rate(di=5.0, b=0.5, t_months=0)
        assert d["nominal_decline_per_month"] <= 0.9


# -------------------------------------------------------- Feature Engineering


class TestFeatureEngineering:
    def _rows(self, n=36, anomaly_last=6):
        rng = np.random.default_rng(42)
        rows = []
        start = pd.Timestamp("2023-01-01")
        for i in range(n):
            expected = 5000.0 * (1 - 0.03) ** i
            actual = expected * (1 + rng.normal(0, 0.02))
            if i >= n - anomaly_last:
                actual *= 0.85
            rows.append({
                "period": str((start + pd.DateOffset(months=i)).date()),
                "oil_bbl_d": actual,
                "expected_bbl_d": expected,
            })
        return rows

    def test_base_feature_columns(self):
        from app.ml.anomaly import build_feature_frame
        _, names = build_feature_frame(self._rows())
        assert names == [
            "production", "production_deviation", "rolling_mean",
            "rolling_std", "decline_rate",
        ]

    def test_feature_matrix_matches_row_count(self):
        from app.ml.anomaly import build_feature_frame
        rows = self._rows(n=24)
        df, _ = build_feature_frame(rows)
        assert len(df) == 24

    def test_operational_z_scores_added_with_coverage(self):
        from app.ml.anomaly import build_feature_frame
        rows = self._rows()
        for r in rows:
            r["pressure"] = 150.0 + np.random.default_rng(0).normal(0, 2)
        _, names = build_feature_frame(rows)
        assert "pressure_z" in names

    def test_sparse_operational_excluded(self):
        from app.ml.anomaly import build_feature_frame
        rows = self._rows()
        for i, r in enumerate(rows):
            r["pressure"] = 150.0 if i < 3 else None
        _, names = build_feature_frame(rows[:20])
        assert "pressure_z" not in names

    def test_missing_required_column_raises(self):
        from app.ml.anomaly import build_feature_frame
        with pytest.raises(ValueError, match="missing columns"):
            build_feature_frame([{"period": "2024-01-01", "oil_bbl_d": 100}])


# -------------------------------------------------------- Synthetic Generator


class TestSyntheticGenerator:
    def test_provenance_flags_on_every_observation(self):
        from app.utils.synthetic_generator import SyntheticGenerator
        gen = SyntheticGenerator("T-1", {"qi": 5000, "di": 0.03, "b": 0.5}, seed=42)
        for _ in range(5):
            obs = gen.next_observation()
            assert obs["source_type"] == "SYNTHETIC"
            assert obs["simulation"] is True
            assert obs["disclaimer"]

    def test_seed_determinism(self):
        from app.utils.synthetic_generator import SyntheticGenerator
        obs_a = [SyntheticGenerator("T-1", {"qi": 5000, "di": 0.03, "b": 0.5}, seed=99).next_observation()["production_bbl_d"] for _ in range(10)]
        obs_b = [SyntheticGenerator("T-1", {"qi": 5000, "di": 0.03, "b": 0.5}, seed=99).next_observation()["production_bbl_d"] for _ in range(10)]
        assert obs_a == obs_b

    def test_different_seeds_diverge(self):
        from app.utils.synthetic_generator import SyntheticGenerator
        obs_a = SyntheticGenerator("T-1", {"qi": 5000, "di": 0.03, "b": 0.5}, seed=1).next_observation()["production_bbl_d"]
        obs_b = SyntheticGenerator("T-1", {"qi": 5000, "di": 0.03, "b": 0.5}, seed=2).next_observation()["production_bbl_d"]
        assert obs_a != obs_b

    def test_scenarios_all_produce_valid_output(self):
        from app.utils.synthetic_generator import SyntheticGenerator, SCENARIOS
        for scenario_name in SCENARIOS:
            gen = SyntheticGenerator("T-1", {"qi": 5000, "di": 0.03, "b": 0.5}, scenario=scenario_name, seed=42)
            obs = gen.next_observation()
            assert obs["production_bbl_d"] > 0
            assert obs["pressure_bar"] > 0

    def test_scenario_aliases_resolve(self):
        from app.utils.synthetic_generator import resolve_scenario
        assert resolve_scenario("DECLINE") == "GRADUAL_CLOG"
        assert resolve_scenario("RECOVERY") == "RECOVERY_EVENT"
        assert resolve_scenario("EQUIPMENT_FAILURE") == "VALVE_FAILURE"
        assert resolve_scenario("GRADUAL_CLOG") == "GRADUAL_CLOG"

    def test_valve_failure_closes_valve(self):
        from app.utils.synthetic_generator import SyntheticGenerator
        gen = SyntheticGenerator("T-1", {"qi": 5000, "di": 0.03, "b": 0.5}, scenario="VALVE_FAILURE", seed=42)
        for _ in range(12):
            gen.next_observation()
        closed_observed = any(gen.next_observation()["valve_status"] == "CLOSED" for _ in range(15))
        assert closed_observed

    def test_gradual_clog_declines_production(self):
        from app.utils.synthetic_generator import SyntheticGenerator
        gen = SyntheticGenerator("T-1", {"qi": 5000, "di": 0.03, "b": 0.5}, scenario="GRADUAL_CLOG", seed=42)
        first = gen.next_observation()["production_bbl_d"]
        for _ in range(25):
            last = gen.next_observation()["production_bbl_d"]
        assert last < first

    def test_snapshot_returns_tick_info(self):
        from app.utils.synthetic_generator import SyntheticGenerator
        gen = SyntheticGenerator("T-1", {"qi": 5000, "di": 0.03, "b": 0.5}, seed=42)
        gen.next_observation()
        snap = gen.snapshot()
        assert snap["tick"] == 1
        assert snap["scenario"] == "NORMAL"

    def test_reset_replays_same_series(self):
        from app.utils.synthetic_generator import SyntheticGenerator
        gen = SyntheticGenerator("T-1", {"qi": 5000, "di": 0.03, "b": 0.5}, seed=42)
        seq_a = [gen.next_observation()["production_bbl_d"] for _ in range(10)]
        gen.reset()
        seq_b = [gen.next_observation()["production_bbl_d"] for _ in range(10)]
        assert seq_a == seq_b

    def test_inject_anomaly_mid_run(self):
        from app.utils.synthetic_generator import SyntheticGenerator
        gen = SyntheticGenerator("T-1", {"qi": 5000, "di": 0.03, "b": 0.5}, seed=42)
        for _ in range(5):
            gen.next_observation()
        gen.set_scenario("GRADUAL_CLOG")
        assert gen.scenario == "GRADUAL_CLOG"
        mid_obs = gen.next_observation()
        assert mid_obs["scenario"] == "GRADUAL_CLOG"


# -------------------------------------------------------- Anomaly Detector


class TestAnomalyDetectorUnit:
    def test_severity_for_score_default_bands(self):
        from app.ml.anomaly import severity_for_score
        assert severity_for_score(0.90) == "CRITICAL"
        assert severity_for_score(0.75) == "ALERT"
        assert severity_for_score(0.55) == "WATCH"
        assert severity_for_score(0.30) == "NORMAL"

    def test_severity_for_score_clamps(self):
        from app.ml.anomaly import severity_for_score
        assert severity_for_score(1.5) == "CRITICAL"
        assert severity_for_score(-0.1) == "NORMAL"

    def test_detector_fit_rejects_fewer_than_12_rows(self):
        from app.ml.anomaly import ProductionAnomalyDetector
        rows = _anomaly_rows(n=10)
        with pytest.raises(ValueError, match=">= 12"):
            ProductionAnomalyDetector().fit(rows)

    def test_score_row_range(self):
        from app.ml.anomaly import ProductionAnomalyDetector
        rows = _anomaly_rows()
        det = ProductionAnomalyDetector().fit(rows)
        for r in rows[:5]:
            scores = det.score_series([r])
            assert 0.0 <= float(scores[0]) <= 1.0

    def test_detect_windows_returns_anomaly_windows(self):
        from app.ml.anomaly import ProductionAnomalyDetector
        rows = _anomaly_rows()
        windows = ProductionAnomalyDetector().fit(rows).detect_windows("T-1", rows)
        assert len(windows) > 0
        for w in windows:
            assert w.asset_id == "T-1"
            assert w.severity in ("WATCH", "ALERT", "CRITICAL")
            assert w.anomaly_score >= 0.5

    def test_detector_evaluation_metric_ranges(self):
        from app.ml.anomaly import ProductionAnomalyDetector, evaluate_detector
        rows = _anomaly_rows()
        det = ProductionAnomalyDetector().fit(rows)
        evaluation = evaluate_detector(det, rows)
        assert evaluation is not None
        d = evaluation.to_dict()
        for m in ("precision", "recall", "f1", "roc_auc"):
            assert 0.0 <= d[m] <= 1.0

    def test_window_explanation_disclaims_root_cause(self):
        from app.ml.anomaly import ProductionAnomalyDetector
        rows = _anomaly_rows()
        windows = ProductionAnomalyDetector().fit(rows).detect_windows("T-1", rows)
        for w in windows:
            assert "not a verified physical root cause" in w.explanation.lower()

    def test_contributing_features_present(self):
        from app.ml.anomaly import ProductionAnomalyDetector
        rows = _anomaly_rows()
        windows = ProductionAnomalyDetector().fit(rows).detect_windows("T-1", rows)
        for w in windows:
            assert len(w.contributing_features) > 0
            for cf in w.contributing_features:
                assert "feature" in cf and "importance" in cf


# ------------------------------------------------------------- AIPS Service


class TestAIPSServiceUnit:
    def test_weights_sum_to_0_80(self):
        from app.services.aips_service import AIPS_WEIGHTS
        assert abs(sum(AIPS_WEIGHTS.values()) - 0.80) < 1e-9

    def test_formula_string_present(self):
        from app.services.aips_service import AIPS_FORMULA
        assert "0.30" in AIPS_FORMULA
        assert "0.25" in AIPS_FORMULA
        assert "0.35" in AIPS_FORMULA

    def test_disclaimer_present(self):
        from app.services.aips_service import AIPS_DISCLAIMER
        assert "single source of truth" in AIPS_DISCLAIMER

    def test_score_clamped_0_100(self):
        from app.services.aips_service import AIPSInput, calculate_aips
        from app.services.recovery_service import estimate_recovery_opportunity
        recovery = estimate_recovery_opportunity(1000.0, 1000.0, 0.0)
        r = calculate_aips(AIPSInput(1000.0, 1000.0, 0.0, 0.5, recovery))
        assert r.score == 0.0
        recovery = estimate_recovery_opportunity(1000.0, 100.0, 1.0)
        r = calculate_aips(AIPSInput(1000.0, 100.0, 1.0, 0.0, recovery))
        assert 0.0 <= r.score <= 100.0

    def test_priority_bands_default(self):
        from app.services.aips_service import priority_for_score
        assert priority_for_score(85) == "CRITICAL"
        assert priority_for_score(65) == "HIGH"
        assert priority_for_score(45) == "MEDIUM"
        assert priority_for_score(10) == "LOW"

    def test_loss_magnitude_is_symmetric(self):
        from app.services.aips_service import AIPSInput, calculate_aips
        from app.services.recovery_service import estimate_recovery_opportunity
        r1 = estimate_recovery_opportunity(1000.0, 800.0, 0.5)
        r2 = estimate_recovery_opportunity(1000.0, 1200.0, 0.5)
        a1 = calculate_aips(AIPSInput(1000.0, 800.0, 0.5, 0.5, r1))
        a2 = calculate_aips(AIPSInput(1000.0, 1200.0, 0.5, 0.5, r2))
        assert a1.loss_magnitude_pct == pytest.approx(a2.loss_magnitude_pct, abs=1e-6)

    def test_result_to_dict_has_all_keys(self):
        from app.services.aips_service import AIPSInput, calculate_aips
        from app.services.recovery_service import estimate_recovery_opportunity
        recovery = estimate_recovery_opportunity(10000.0, 8500.0, 0.8)
        result = calculate_aips(AIPSInput(10000.0, 8500.0, 0.8, 0.5, recovery))
        d = result.to_dict()
        for key in ("model", "score", "priority", "formula", "weights",
                     "breakdown", "components", "disclaimer"):
            assert key in d, f"missing: {key}"


# ------------------------------------------------------ Recovery Opportunity


class TestRecoveryOpportunityUnit:
    def test_no_gap_zero_recovery(self):
        from app.services.recovery_service import estimate_recovery_opportunity
        r = estimate_recovery_opportunity(10000.0, 10000.0, 0.5)
        assert r.gap_bbl_d == 0.0
        assert r.estimated_volume_mmbbl == 0.0

    def test_model_confidence_tiers(self):
        from app.services.recovery_service import model_confidence_for_anomaly
        assert model_confidence_for_anomaly(0.86) == 0.90
        assert model_confidence_for_anomaly(0.70) == 0.75
        assert model_confidence_for_anomaly(0.40) == 0.60
        assert model_confidence_for_anomaly(0.85) == 0.75

    def test_volume_formula(self):
        from app.services.recovery_service import estimate_recovery_opportunity
        gap = 2000.0
        loss_mmbbl = gap * 365.0 / 1e6
        hist_rate = 0.80
        model_conf = 0.90
        expected_volume = loss_mmbbl * hist_rate * model_conf
        r = estimate_recovery_opportunity(10000.0, 8000.0, 0.95, historical_recovery_rate=hist_rate)
        assert r.estimated_volume_mmbbl == pytest.approx(expected_volume, abs=1e-3)

    def test_label_and_caveat(self):
        from app.services.recovery_service import estimate_recovery_opportunity, ESTIMATED_RECOVERY_LABEL, RECOVERY_CAVEAT
        r = estimate_recovery_opportunity(10000.0, 8000.0, 0.8)
        assert r.label == ESTIMATED_RECOVERY_LABEL
        assert r.caveat == RECOVERY_CAVEAT
        assert "guaranteed" not in r.to_dict()["label"].lower()

    def test_combined_confidence_average(self):
        from app.services.recovery_service import estimate_recovery_opportunity
        r = estimate_recovery_opportunity(10000.0, 8000.0, 0.95, historical_recovery_rate=0.80)
        expected = (0.80 + 0.90) / 2.0
        assert r.combined_confidence == pytest.approx(expected, abs=1e-6)


# ---------------------------------------------------- SHAP / Attribution


class TestSHAPFormatting:
    def test_terminology_constant(self):
        from app.intelligence.attribution import TERMINOLOGY
        assert TERMINOLOGY == "Model-Estimated Feature Contributions"

    def test_caveat_constant(self):
        from app.intelligence.attribution import CAVEAT
        assert "does not establish physical causality" in CAVEAT

    def test_contribution_schema(self):
        from app.intelligence.attribution import attribute_deviation
        from app.ml.forecast import ProductionForecaster
        vals = _arps_series_vals()
        params = _fit_params(vals)
        fc = ProductionForecaster(random_state=42).fit(vals, arps_params=params)
        attr = attribute_deviation(fc, vals, vals[-1] * 1.02, vals[-1])
        for c in attr["contributions"]:
            assert {"feature", "value", "baseline", "shap_value",
                    "direction", "relative_contribution_pct"} <= set(c)
            assert c["direction"] in ("UPWARD", "DOWNWARD")
            assert 0.0 <= c["relative_contribution_pct"] <= 100.0

    def test_terminology_in_payload(self):
        from app.intelligence.attribution import attribute_deviation, TERMINOLOGY
        from app.ml.forecast import ProductionForecaster
        vals = _arps_series_vals()
        params = _fit_params(vals)
        fc = ProductionForecaster(random_state=42).fit(vals, arps_params=params)
        attr = attribute_deviation(fc, vals, vals[-1], vals[-1])
        assert attr["terminology"] == TERMINOLOGY

    def test_no_root_cause_in_payload(self):
        import json
        from app.intelligence.attribution import attribute_deviation
        from app.ml.forecast import ProductionForecaster
        vals = _arps_series_vals()
        params = _fit_params(vals)
        fc = ProductionForecaster(random_state=42).fit(vals, arps_params=params)
        attr = attribute_deviation(fc, vals, vals[-1], vals[-1])
        dumped = json.dumps(attr)
        assert "Verified Root Cause" not in dumped

    def test_method_is_tree_or_fallback(self):
        from app.intelligence.attribution import attribute_deviation
        from app.ml.forecast import ProductionForecaster
        vals = _arps_series_vals()
        params = _fit_params(vals)
        fc = ProductionForecaster(random_state=42).fit(vals, arps_params=params)
        attr = attribute_deviation(fc, vals, vals[-1], vals[-1])
        assert attr["explainer_method"] in ("shap-tree-explainer", "mean-ablation-fallback")


# --------------------------------------------------- Recommendation Engine


class TestRecommendationEngine:
    def test_normal_asset_gets_monitor(self):
        from app.services.recommendation_service import generate_recommendations
        recs = generate_recommendations(
            deviation_pct=-2.0, anomaly_score=0.3, anomaly_severity="NORMAL",
            recovery_opportunity_pct=1.0, estimated_volume_mmbbl=0.001,
            combined_confidence=0.60, intervention_complexity=0.3,
            aips_priority="LOW", asset_id="T-1",
        )
        codes = {r.code for r in recs.recommendations}
        assert "MONITOR_ASSET" in codes

    def test_high_deviation_gets_investigate(self):
        from app.services.recommendation_service import generate_recommendations
        recs = generate_recommendations(
            deviation_pct=-15.0, anomaly_score=0.8, anomaly_severity="ALERT",
            recovery_opportunity_pct=10.0, estimated_volume_mmbbl=0.1,
            combined_confidence=0.80, intervention_complexity=0.5,
            aips_priority="HIGH", asset_id="T-1",
        )
        codes = {r.code for r in recs.recommendations}
        assert "INVESTIGATE_DEVIATION" in codes

    def test_critical_priority_gets_engineering_review(self):
        from app.services.recommendation_service import generate_recommendations
        recs = generate_recommendations(
            deviation_pct=-20.0, anomaly_score=0.9, anomaly_severity="CRITICAL",
            recovery_opportunity_pct=12.0, estimated_volume_mmbbl=0.2,
            combined_confidence=0.85, intervention_complexity=0.7,
            aips_priority="CRITICAL", asset_id="T-1",
        )
        codes = {r.code for r in recs.recommendations}
        assert "PRIORITIZE_ENGINEERING_REVIEW" in codes

    def test_high_complexity_gets_feasibility_review(self):
        from app.services.recommendation_service import generate_recommendations
        recs = generate_recommendations(
            deviation_pct=-12.0, anomaly_score=0.8, anomaly_severity="ALERT",
            recovery_opportunity_pct=10.0, estimated_volume_mmbbl=0.1,
            combined_confidence=0.80, intervention_complexity=0.90,
            aips_priority="HIGH", asset_id="T-1",
        )
        codes = {r.code for r in recs.recommendations}
        assert "COMPLEXITY_FEASIBILITY_REVIEW" in codes

    def test_disclaimer_always_present(self):
        from app.services.recommendation_service import generate_recommendations, DECISION_SUPPORT_DISCLAIMER
        recs = generate_recommendations(
            deviation_pct=-5.0, anomaly_score=0.5, anomaly_severity="WATCH",
            recovery_opportunity_pct=5.0, estimated_volume_mmbbl=0.05,
            combined_confidence=0.70, intervention_complexity=0.5,
            aips_priority="MEDIUM", asset_id="T-1",
        )
        assert recs.disclaimer == DECISION_SUPPORT_DISCLAIMER
        d = recs.to_dict()
        assert d["disclaimer"] == DECISION_SUPPORT_DISCLAIMER

    def test_recommendation_actions_are_safe_language(self):
        """All recommendation actions must use approved decision-support verbs."""
        from app.services.recommendation_service import generate_recommendations
        ALLOWED = {
            "Monitor asset", "Investigate production deviation",
            "Verify operational parameters", "Prioritize engineering review",
            "Field verification recommended", "Review diagnosis confidence",
            "Assess intervention feasibility and cost",
        }
        recs = generate_recommendations(
            deviation_pct=-18.0, anomaly_score=0.88, anomaly_severity="CRITICAL",
            recovery_opportunity_pct=12.0, estimated_volume_mmbbl=0.15,
            combined_confidence=0.80, intervention_complexity=0.6,
            aips_priority="CRITICAL", asset_id="T-1",
        )
        for r in recs.recommendations:
            assert r.action in ALLOWED

    def test_summary_starts_with_count(self):
        from app.services.recommendation_service import generate_recommendations
        recs = generate_recommendations(
            deviation_pct=-2.0, anomaly_score=0.3, anomaly_severity="NORMAL",
            recovery_opportunity_pct=1.0, estimated_volume_mmbbl=0.001,
            combined_confidence=0.60, intervention_complexity=0.3,
            aips_priority="LOW", asset_id="T-1",
        )
        assert recs.summary.startswith(f"{len(recs.recommendations)} decision-support")


# --------------------------------------------------------------- Helpers


def _arps_series(qi=5000.0, di=0.05, b=0.6, months=36, noise=0.01, seed=3):
    from app.ml.arps import arps_rate
    rng = np.random.default_rng(seed)
    t = np.arange(months, dtype=float)
    return (arps_rate(qi, di, b, t) * (1 + rng.normal(0, noise, months))).tolist(), t


def _arps_series_vals():
    vals, _ = _arps_series()
    return vals


def _fit_params(vals):
    from app.ml.arps import fit_arps
    fit = fit_arps(vals)
    return {"qi": fit.qi, "di": fit.di, "b": fit.b}


def _anomaly_rows(n=36, inject_last=6):
    rng = np.random.default_rng(42)
    rows = []
    start = pd.Timestamp("2023-01-01")
    for i in range(n):
        expected = 5000.0 * (1 - 0.03) ** i
        actual = expected * (1 + rng.normal(0, 0.02))
        if i >= n - inject_last:
            actual *= 0.85
        rows.append({
            "period": str((start + pd.DateOffset(months=i)).date()),
            "oil_bbl_d": actual,
            "expected_bbl_d": expected,
        })
    return rows
