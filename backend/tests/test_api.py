"""End-to-end API contract tests (fresh temp DB per session).

Database URL and startup behaviour are configured in conftest.py so the
environment is fixed before any app module is imported. The shared
session-scoped ``client`` fixture lives in conftest.py.
"""

import pytest


def test_health(client):
    res = client.get("/health")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok"


def test_assets_list_seeded(client):
    res = client.get("/api/v1/assets")
    assert res.status_code == 200
    assets = res.json()
    ids = {a["id"] for a in assets}
    assert {"MH-07", "CB-12", "KG-05"} <= ids


def test_asset_history_shape(client):
    res = client.get("/api/v1/assets/MH-07/history?months=12")
    assert res.status_code == 200
    rows = res.json()
    assert len(rows) == 12
    for row in rows:
        assert row["source"] in ("REAL", "SYNTHETIC", "DERIVED")
        assert row["actual"] >= 0


def test_unknown_asset_404(client):
    assert client.get("/api/v1/assets/NOPE-99").status_code == 404


def test_leaderboard_contract(client):
    res = client.get("/api/v1/assets/leaderboard")
    assert res.status_code == 200
    body = res.json()
    assert body["count"] >= 1
    scores = [r["aipsScore"] for r in body["rows"]]
    assert scores == sorted(scores, reverse=True), "leaderboard must be AIPS-ranked"
    first = body["rows"][0]
    for key in ("id", "aipsScore", "priority", "deviation", "rank"):
        assert key in first
    assert first["rank"] == 1


def test_mh07_ranks_first_with_injected_anomaly(client):
    res = client.get("/api/v1/assets/MH-07").json()
    assert res["deviation_pct"] < -5.0, "MH-07 must show underperformance vs expectation"
    assert res["anomaly_score"] > 0.3


def test_forecast_endpoint(client):
    res = client.get("/api/v1/forecast/MH-07?horizon_days=90")
    assert res.status_code == 200
    body = res.json()
    assert len(body["points"]) == 3
    point = body["points"][0]
    assert point["lower"] <= point["forecast"] <= point["upper"]
    assert body["backtest_overall"] is None or "mae" in body["backtest_overall"]


def test_priority_and_attribution(client):
    prio = client.get("/api/v1/priority/MH-07").json()
    assert 0 <= prio["score"] <= 100
    assert prio["priority"] in ("CRITICAL", "HIGH", "MEDIUM", "LOW")
    assert "formula" in prio

    attr = client.get("/api/v1/attribution/MH-07").json()
    assert attr["contributions"], "SHAP contributions must not be empty"
    shares = sum(c["share_pct"] for c in attr["contributions"])
    assert shares <= 100.5


def test_provenance_policy_present(client):
    res = client.get("/api/v1/provenance/sources").json()
    classes = {r["dataClass"] for r in res["rows"]}
    assert "SYNTHETIC" in classes
    assert "policy" in res


def test_models_registry(client):
    models = client.get("/api/v1/models").json()["rows"]
    assert {m["id"] for m in models} >= {"MOD-01", "MOD-02", "MOD-03", "ENG-01"}


def test_portfolio_summary_consistent(client):
    summary = client.get("/api/v1/portfolio/summary").json()
    assert summary["totalAssets"] == summary["activeAssets"] + (
        summary["totalAssets"] - summary["activeAssets"]
    )
    assert summary["portfolioDeviationPct"] < 0 or summary["portfolioDeviationPct"] > -100
    assert len(summary["productionTrend"]) >= 6


def test_simulation_session_lifecycle(client):
    created = client.post(
        "/api/v1/simulation/sessions",
        json={"asset_id": "MH-07", "scenario": "VALVE_FAILURE"},
    )
    assert created.status_code == 200
    session_id = created.json()["session_id"]

    patched = client.patch(f"/api/v1/simulation/sessions/{session_id}?scenario=RECOVERY")
    assert patched.status_code == 200
    assert patched.json()["scenario"] == "RECOVERY"

    stopped = client.delete(f"/api/v1/simulation/sessions/{session_id}")
    assert stopped.status_code == 200


def test_simulation_invalid_scenario_rejected(client):
    res = client.post(
        "/api/v1/simulation/sessions",
        json={"asset_id": "MH-07", "scenario": "NOT_A_SCENARIO"},
    )
    assert res.status_code == 422
