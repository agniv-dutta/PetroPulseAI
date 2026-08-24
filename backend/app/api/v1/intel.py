"""Anomaly + attribution endpoints."""

import uuid as uuid_lib

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.ingestion.catalog import CANONICAL_ASSETS
from app.intelligence.pipeline import analyze_asset
from app.models import Anomaly, Asset

router = APIRouter(tags=["intelligence"])

_CATALOG_BY_CODE = {a["id"]: a for a in CANONICAL_ASSETS}

ALLOWED_ANOMALY_STATUSES = {
    "UNACKNOWLEDGED", "ACKNOWLEDGED", "INVESTIGATING", "MONITORING",
    "RESOLVED", "FALSE_POSITIVE",
}


class AnomalyStatusUpdate(BaseModel):
    status: str


@router.get("/anomalies")
def list_anomalies(db: Session = Depends(get_db)) -> dict:
    events = db.execute(
        select(Anomaly).order_by(Anomaly.anomaly_score.desc())
    ).scalars().all()
    return {
        "rows": [
            {
                "id": str(e.id),
                "assetId": e.asset_id,
                "severity": e.severity,
                "anomalyScore": e.anomaly_score,
                "deviationPct": e.production_deviation,
                "detectedAt": e.timestamp.isoformat(),
                "contributingFeatures": e.contributing_features,
                "status": e.status,
                "explanation": e.explanation,
                "modelVersion": e.model_version,
                "source": "DERIVED",
            }
            for e in events
        ],
        "count": len(events),
    }


@router.patch("/anomalies/{anomaly_id}/status")
def update_anomaly_status(
    anomaly_id: str, payload: AnomalyStatusUpdate, db: Session = Depends(get_db)
) -> dict:
    if payload.status not in ALLOWED_ANOMALY_STATUSES:
        raise HTTPException(422, f"status must be one of {sorted(ALLOWED_ANOMALY_STATUSES)}")
    try:
        event_id = uuid_lib.UUID(anomaly_id)
    except ValueError:
        raise HTTPException(404, f"unknown anomaly {anomaly_id}")
    event = db.get(Anomaly, event_id)
    if not event:
        raise HTTPException(404, f"unknown anomaly {anomaly_id}")
    event.status = payload.status
    db.commit()
    return {"id": str(event.id), "status": event.status}


@router.get("/attribution/{asset_id}")
def attribution(asset_id: str, db: Session = Depends(get_db)) -> dict:
    asset = db.execute(
        select(Asset).where(Asset.asset_id == asset_id)
    ).scalars().first()
    if not asset:
        raise HTTPException(404, f"unknown asset {asset_id}")
    analysis = analyze_asset(db, asset)
    return {
        "asset_id": asset_id,
        **analysis["attribution"],
        "shap_explainer": "TreeExplainer (GradientBoosting)",
        "data_source": "DERIVED",
    }


@router.get("/priority/{asset_id}")
def priority(asset_id: str, db: Session = Depends(get_db)) -> dict:
    asset = db.execute(
        select(Asset).where(Asset.asset_id == asset_id)
    ).scalars().first()
    if not asset:
        raise HTTPException(404, f"unknown asset {asset_id}")
    analysis = analyze_asset(db, asset)
    spec = _CATALOG_BY_CODE.get(asset_id, {})
    intervention_cost_usd_m = spec.get("intervention_cost_usd_m", 1.0)
    estimated_value = analysis["aips"]["estimated_value_usd_m"]
    return {
        "asset_id": asset_id,
        **analysis["aips"],
        "recovery": analysis["recovery"],
        "financials": {
            "intervention_cost_usd_m": intervention_cost_usd_m,
            "estimated_value_usd_m": estimated_value,
            "roi_multiple": round(estimated_value / max(intervention_cost_usd_m, 1e-9), 1),
        },
    }


@router.get("/ranking")
def ranking(db: Session = Depends(get_db)) -> dict:
    ranked_rows = []
    for r in analyze_all(db):
        ranked_rows.append({
            "assetId": r["asset"]["id"],
            "name": r["asset"]["name"],
            "basin": r["asset"]["basin"],
            "aipsScore": r["aips"]["score"],
            "priority": r["aips"]["priority"],
            "estimatedValueUsdM": r["aips"]["estimated_value_usd_m"],
            "rank": r["rank"],
        })
    return {"rows": ranked_rows}


def analyze_all(db: Session):
    from app.intelligence.pipeline import get_portfolio_analysis

    return get_portfolio_analysis(db)
