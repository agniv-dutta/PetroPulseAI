"""Comprehensive API endpoint tests.

Tests every registered endpoint for correct HTTP status code
and response shape.

Note: intel + system routers are included under /api/v1 prefix,
so their paths are /api/v1/anomalies, /api/v1/provenance/sources, etc.
"""

import pytest
from fastapi.testclient import TestClient


@pytest.fixture(scope="module")
def api():
    from app.main import app
    with TestClient(app) as c:
        yield c


# ---------------------------------------------------------------- health


class TestHealthEndpoints:
    def test_root_health(self, api):
        r = api.get("/health")
        assert r.status_code == 200
        d = r.json()
        assert d["status"] == "ok"
        assert "version" in d

    def test_api_health(self, api):
        r = api.get("/api/v1/health")
        assert r.status_code == 200
        d = r.json()
        assert "status" in d


# ---------------------------------------------------------------- assets


class TestAssetsEndpoints:
    def test_list_assets(self, api):
        r = api.get("/api/v1/assets")
        assert r.status_code == 200
        assets = r.json()
        assert isinstance(assets, list)
        assert len(assets) >= 12
        for a in assets:
            assert "id" in a

    def test_assets_leaderboard(self, api):
        r = api.get("/api/v1/assets/leaderboard")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, dict)
        rows = data.get("rows", [])
        assert len(rows) >= 1

    def test_asset_detail_mh07(self, api):
        r = api.get("/api/v1/assets/MH-07")
        assert r.status_code == 200
        d = r.json()
        assert d["id"] == "MH-07"
        assert "current_production_bbl_d" in d
        assert "aips" in d
        assert "score" in d["aips"]

    def test_asset_history(self, api):
        r = api.get("/api/v1/assets/MH-07/history")
        assert r.status_code == 200
        history = r.json()
        assert isinstance(history, list)
        assert len(history) >= 24

    def test_unknown_asset_404(self, api):
        r = api.get("/api/v1/assets/UNKNOWN-999")
        assert r.status_code == 404

    def test_unknown_asset_404_envelope(self, api):
        r = api.get("/api/v1/assets/UNKNOWN-999")
        d = r.json()
        assert "error" in d
        assert "message" in d
        assert d["status_code"] == 404


# ---------------------------------------------------------------- forecast


class TestForecastEndpoints:
    def test_forecast_mh07(self, api):
        r = api.get("/api/v1/forecast/MH-07")
        assert r.status_code == 200
        d = r.json()
        assert "points" in d or "forecast_30d" in d

    def test_forecast_with_horizon(self, api):
        r = api.get("/api/v1/forecast/MH-07?horizon_days=30")
        assert r.status_code == 200

    def test_forecast_path_param_30d(self, api):
        r = api.get("/api/v1/forecast/MH-07/30")
        assert r.status_code == 200

    def test_forecast_path_param_90d(self, api):
        r = api.get("/api/v1/forecast/MH-07/90")
        assert r.status_code == 200

    def test_forecast_path_param_180d(self, api):
        r = api.get("/api/v1/forecast/MH-07/180")
        assert r.status_code == 200

    def test_forecast_path_param_365d(self, api):
        r = api.get("/api/v1/forecast/MH-07/365")
        assert r.status_code == 200

    def test_forecast_invalid_horizon_422(self, api):
        r = api.get("/api/v1/forecast/MH-07/999")
        assert r.status_code == 422


# ---------------------------------------------------------------- anomaly


class TestAnomalyEndpoints:
    def test_anomaly_active(self, api):
        r = api.get("/api/v1/anomaly/active")
        assert r.status_code == 200
        d = r.json()
        assert "rows" in d

    def test_anomaly_per_asset(self, api):
        r = api.get("/api/v1/anomaly/MH-07")
        assert r.status_code == 200


# ---------------------------------------------------------------- AIPS


class TestAIPSEndpoints:
    def test_aips_ranking(self, api):
        r = api.get("/api/v1/aips/ranking")
        assert r.status_code == 200
        d = r.json()
        assert "rows" in d

    def test_aips_per_asset(self, api):
        r = api.get("/api/v1/aips/MH-07")
        assert r.status_code == 200
        d = r.json()
        assert "score" in d or "aips" in d


# ---------------------------------------------------------------- SHAP


class TestSHAPEndpoints:
    def test_shap_mh07(self, api):
        r = api.get("/api/v1/shap/MH-07")
        assert r.status_code == 200
        d = r.json()
        assert "contributions" in d or "terminology" in d


# ---------------------------------------------------------------- Metrics


class TestMetricsEndpoints:
    def test_metrics_forecast(self, api):
        r = api.get("/api/v1/metrics/forecast")
        assert r.status_code == 200

    def test_metrics_anomaly(self, api):
        r = api.get("/api/v1/metrics/anomaly")
        assert r.status_code == 200


# ---------------------------------------------------------------- Intel (under /api/v1 prefix)


class TestIntelEndpoints:
    def test_list_anomalies(self, api):
        r = api.get("/api/v1/anomalies")
        assert r.status_code == 200

    def test_attribution(self, api):
        r = api.get("/api/v1/attribution/MH-07")
        assert r.status_code == 200
        d = r.json()
        assert "terminology" in d or "contributions" in d

    def test_priority(self, api):
        r = api.get("/api/v1/priority/MH-07")
        assert r.status_code == 200

    def test_ranking(self, api):
        r = api.get("/api/v1/ranking")
        assert r.status_code == 200


# ---------------------------------------------------------------- System (under /api/v1 prefix)


class TestSystemEndpoints:
    def test_provenance_sources(self, api):
        r = api.get("/api/v1/provenance/sources")
        assert r.status_code == 200

    def test_models(self, api):
        r = api.get("/api/v1/models")
        assert r.status_code == 200

    def test_portfolio_summary(self, api):
        r = api.get("/api/v1/portfolio/summary")
        assert r.status_code == 200


# ---------------------------------------------------------------- Simulation


class TestSimulationEndpoints:
    def test_list_scenarios(self, api):
        r = api.get("/api/v1/simulation/scenarios")
        assert r.status_code == 200
        d = r.json()
        assert isinstance(d, list)
        scenario_ids = {s.get("id", "") for s in d}
        assert "GRADUAL_CLOG" in scenario_ids or "NORMAL" in scenario_ids

    def test_start_simulation(self, api):
        r = api.post("/api/v1/simulation/start", json={
            "asset_id": "CB-08",
            "scenario": "NORMAL",
            "speed_multiplier": 10.0,
            "interval_seconds": 6.0,
            "duration_ticks": 5,
        })
        assert r.status_code == 200
        d = r.json()
        assert "session_id" in d or "simulation_id" in d or "id" in d

    def test_invalid_speed_422(self, api):
        r = api.post("/api/v1/simulation/start", json={
            "asset_id": "CB-08",
            "scenario": "NORMAL",
            "speed_multiplier": 3.0,
        })
        assert r.status_code == 422

    def test_invalid_scenario_422(self, api):
        r = api.post("/api/v1/simulation/start", json={
            "asset_id": "CB-08",
            "scenario": "NONEXISTENT_SCENARIO",
            "speed_multiplier": 5.0,
        })
        assert r.status_code == 422


# ---------------------------------------------------------- Error Envelopes


class TestErrorEnvelopes:
    def test_404_envelope_shape(self, api):
        r = api.get("/api/v1/assets/NOPE-999")
        assert r.status_code == 404
        d = r.json()
        assert "error" in d
        assert "message" in d
        assert "status_code" in d

    def test_422_envelope_shape(self, api):
        r = api.get("/api/v1/forecast/MH-07/999")
        assert r.status_code == 422
        d = r.json()
        assert "error" in d
        assert d["status_code"] == 422
