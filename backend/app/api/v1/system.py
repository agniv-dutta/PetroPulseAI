"""Data-source catalogue, model registry, portfolio summary and simulation control."""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.intelligence.pipeline import get_portfolio_analysis
from app.models import DataSource, ModelVersion, ProductionHistory

router = APIRouter(tags=["system"])



@router.get("/provenance/sources")
def provenance_sources(db: Session = Depends(get_db)) -> dict:
    rows = db.execute(select(DataSource).order_by(DataSource.source_name)).scalars().all()
    return {
        "rows": [
            {
                "id": str(r.id),
                "datasetName": r.dataset_name,
                "publisher": r.source_name,
                "dataClass": r.source_type,
                "url": r.url,
                "coverage": r.coverage,
                "updateFrequency": r.update_frequency,
                "ingestedAt": r.last_updated.isoformat(),
                "notes": r.description,
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
    rows = db.execute(select(ModelVersion).order_by(ModelVersion.code)).scalars().all()
    return {
        "rows": [
            {
                "id": m.code,
                "name": m.model_name,
                "version": m.version,
                "task": m.task,
                "algorithm": m.algorithm,
                "registeredAt": m.registered_at.isoformat(),
                "metrics": m.hyperparameters,
                "status": m.status,
            }
            for m in rows
        ]
    }


class RetrainRequest(BaseModel):
    force: bool = False


@router.post("/models/{model_id}/retrain")
def retrain_model(model_id: str, payload: RetrainRequest, db: Session = Depends(get_db)) -> dict:
    entry = db.execute(
        select(ModelVersion).where(ModelVersion.code == model_id)
    ).scalars().first()
    if not entry:
        raise HTTPException(404, f"unknown model {model_id}")
    from app.core.database import SessionLocal
    from app.intelligence.pipeline import warm_cache

    db_session = SessionLocal()
    try:
        assets_analyzed = warm_cache(db_session)
    finally:
        db_session.close()
    entry.registered_at = datetime.now(timezone.utc)
    entry.status = "READY"
    db.commit()
    return {
        "model_id": model_id,
        "status": "RETRAINED",
        "assets_analyzed": assets_analyzed,
        "completed_at": entry.registered_at.isoformat(),
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

    trend_points = _portfolio_trend()
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


def _portfolio_trend() -> list[dict]:
    """Aggregate monthly actual vs seasonal-Arps expectation across assets."""
    from app.ingestion.seed import expected_series

    from app.core.database import SessionLocal

    session = SessionLocal()
    try:
        rows = session.execute(
            select(
                ProductionHistory.asset_id,
                ProductionHistory.timestamp,
                ProductionHistory.production,
            ).order_by(ProductionHistory.timestamp.asc())
        ).all()
    finally:
        session.close()

    by_asset: dict[str, list[tuple[datetime, float]]] = {}
    for asset_id, ts, production in rows:
        by_asset.setdefault(asset_id, []).append((ts, production))

    monthly_actual: dict[str, float] = {}
    monthly_expected: dict[str, float] = {}
    for asset_id, series in by_asset.items():
        timestamps = [ts for ts, _ in series]
        expected_values = expected_series(asset_id, timestamps)
        for (ts, production), exp in zip(series, expected_values):
            key = ts.strftime("%Y-%m")
            monthly_actual[key] = monthly_actual.get(key, 0.0) + float(production)
            monthly_expected[key] = monthly_expected.get(key, 0.0) + float(exp)

    keys = sorted(monthly_actual)[-12:]
    return [
        {
            "period": f"{key}-01",
            "actual": round(monthly_actual[key] / 1000.0, 2),
            "expected": round(monthly_expected.get(key, 0.0) / 1000.0, 2),
        }
        for key in keys
    ]


# ---------------------------------------------------------------- simulation
class SimulationStartRequest(BaseModel):
    asset_id: str = Field(examples=["MH-07"])
    scenario: str = Field(default="NORMAL")


@router.post("/simulation/sessions")
async def start_session(payload: SimulationStartRequest, db: Session = Depends(get_db)) -> dict:
    from app.services.simulation_service import (
        get_simulation_service,
        VALID_SCENARIO_LABELS,
    )

    if payload.scenario.upper() not in [v.upper() for v in VALID_SCENARIO_LABELS]:
        raise HTTPException(422, f"scenario must be one of {sorted(set(VALID_SCENARIO_LABELS))}")
    from app.models import Asset

    asset_exists = db.execute(
        select(Asset).where(Asset.asset_id == payload.asset_id).limit(1)
    ).scalar()
    if not asset_exists:
        raise HTTPException(404, f"unknown asset {payload.asset_id}")

    try:
        return await get_simulation_service().start(
            asset_id=payload.asset_id,
            scenario=payload.scenario,
            speed_multiplier=1.0,
        )
    except ValueError as exc:
        raise HTTPException(422, str(exc))
    except KeyError as exc:
        raise HTTPException(404, str(exc))
    except RuntimeError as exc:
        raise HTTPException(429, str(exc))


@router.patch("/simulation/sessions/{session_id}")
async def update_session(session_id: str, scenario: str) -> dict:
    from app.services.simulation_service import get_simulation_service

    try:
        snap = await get_simulation_service().set_scenario(session_id, scenario)
    except ValueError as exc:
        raise HTTPException(422, str(exc))
    if snap is None:
        raise HTTPException(404, f"unknown session {session_id}")
    return snap


@router.delete("/simulation/sessions/{session_id}")
async def stop_session(session_id: str) -> dict:
    from app.services.simulation_service import get_simulation_service

    await get_simulation_service().stop(session_id)
    return {"stopped": session_id}
