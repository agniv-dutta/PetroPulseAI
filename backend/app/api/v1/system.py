"""Provenance, model registry, portfolio summary and simulation REST control."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.intelligence.pipeline import get_portfolio_analysis
from app.models import ModelRegistryEntry, ProvenanceRecord
from app.simulation.engine import ANOMALY_SCENARIOS
from app.simulation.ws import hub

router = APIRouter(tags=["system"])

SCENARIO_IDS = sorted(ANOMALY_SCENARIOS.keys())


@router.get("/provenance/sources")
def provenance_sources(db: Session = Depends(get_db)) -> dict:
    rows = db.execute(select(ProvenanceRecord)).scalars().all()
    return {
        "rows": [
            {
                "id": r.id,
                "datasetName": r.dataset_name,
                "publisher": r.publisher,
                "dataClass": r.data_class,
                "url": r.url,
                "ingestedAt": r.ingested_at.isoformat(),
                "recordCount": r.record_count,
                "integrityScore": r.integrity_score,
                "notes": r.notes,
            }
            for r in rows
        ],
        "policy": (
            "REAL = published public data (OGD/PPAC/DGH). SYNTHETIC = generated "
            "for demonstration; never actual operator telemetry. DERIVED = model output."
        ),
    }


@router.get("/models")
def list_models(db: Session = Depends(get_db)) -> dict:
    rows = db.execute(select(ModelRegistryEntry).order_by(ModelRegistryEntry.id)).scalars().all()
    return {
        "rows": [
            {
                "id": m.id, "name": m.name, "task": m.task, "algorithm": m.algorithm,
                "trainedAt": m.trained_at.isoformat(), "metrics": m.metrics, "status": m.status,
            }
            for m in rows
        ]
    }


class RetrainRequest(BaseModel):
    force: bool = False


@router.post("/models/{model_id}/retrain")
def retrain_model(model_id: str, payload: RetrainRequest, db: Session = Depends(get_db)) -> dict:
    entry = db.get(ModelRegistryEntry, model_id)
    if not entry:
        raise HTTPException(404, f"unknown model {model_id}")
    from app.core.database import SessionLocal
    from app.intelligence.pipeline import warm_cache

    db_session = SessionLocal()
    try:
        assets_analyzed = warm_cache(db_session)
    finally:
        db_session.close()
    entry.trained_at = datetime.now(timezone.utc)
    entry.status = "READY"
    db.commit()
    return {
        "model_id": model_id,
        "status": "RETRAINED",
        "assets_analyzed": assets_analyzed,
        "completed_at": entry.trained_at.isoformat(),
    }


@router.get("/portfolio/summary")
def portfolio_summary(db: Session = Depends(get_db)) -> dict:
    ranked = get_portfolio_analysis(db)
    active = [r for r in ranked if r["asset"]["status"] == "ACTIVE"]
    at_risk = [r for r in active if r["anomaly_score"] >= 0.5]
    current_total = sum(r["current_production_bbl_d"] for r in active)
    expected_total = sum(r["expected_production_bbl_d"] for r in active)

    top_anomalies = []
    for r in sorted(active, key=lambda x: -x["anomaly_score"])[:4]:
        if r["anomaly_windows"]:
            w = r["anomaly_windows"][-1]
            top_anomalies.append({
                "assetId": r["asset"]["id"],
                "assetName": r["asset"]["name"],
                "severity": w["severity"],
                "anomalyScore": w["anomaly_score"],
                "deviationPct": r["deviation_pct"],
                "period": w["period"],
            })

    trend_points = _portfolio_trend(ranked)
    return {
        "totalAssets": len(ranked),
        "activeAssets": len(active),
        "atRiskAssets": len(at_risk),
        "currentProductionKbblD": round(current_total / 1000.0, 2),
        "expectedProductionKbblD": round(expected_total / 1000.0, 2),
        "portfolioDeviationPct": round(
            (current_total - expected_total) / max(expected_total, 1e-9) * 100.0, 2
        ),
        "topAnomalies": top_anomalies,
        "productionTrend": trend_points,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "dataSource": "DERIVED (synthetic-seeded history)",
    }


def _portfolio_trend(ranked: list[dict]) -> list[dict]:
    """Aggregate last-12-month actual vs expected across analysed assets."""
    from sqlalchemy import func

    from app.core.database import SessionLocal
    from app.models import MonthlyProduction

    session = SessionLocal()
    try:
        rows = session.execute(
            select(
                MonthlyProduction.period,
                func.sum(MonthlyProduction.oil_bbl_d).label("actual"),
                func.sum(MonthlyProduction.expected_bbl_d).label("expected"),
            )
            .group_by(MonthlyProduction.period)
            .order_by(MonthlyProduction.period.desc())
            .limit(12)
        ).all()
    finally:
        session.close()
    return [
        {
            "period": r.period.isoformat(),
            "actual": round(float(r.actual or 0) / 1000.0, 2),
            "expected": round(float(r.expected or 0) / 1000.0, 2),
        }
        for r in reversed(rows)
    ]


# ---------------------------------------------------------------- simulation
class SimulationStartRequest(BaseModel):
    asset_id: str = Field(examples=["MH-07"])
    scenario: str = Field(default="NORMAL")


@router.get("/simulation/scenarios")
def scenarios() -> list[dict]:
    return [
        {"id": sid, **{"description": spec.description}}
        for sid, spec in ANOMALY_SCENARIOS.items()
    ]


@router.post("/simulation/sessions")
def start_session(payload: SimulationStartRequest) -> dict:
    import uuid

    if payload.scenario not in ANOMALY_SCENARIOS:
        raise HTTPException(422, f"scenario must be one of {SCENARIO_IDS}")
    session_id = uuid.uuid4().hex[:12]
    session = hub.create_session(session_id, payload.asset_id, payload.scenario)
    return {"session_id": session_id, **session.snapshot()}


@router.patch("/simulation/sessions/{session_id}")
def update_session(session_id: str, scenario: str) -> dict:
    snap = hub.set_scenario(session_id, scenario)
    if not snap:
        raise HTTPException(404, f"unknown session {session_id}")
    return snap


@router.delete("/simulation/sessions/{session_id}")
async def stop_session(session_id: str) -> dict:
    await hub.remove_session(session_id)
    return {"stopped": session_id}
