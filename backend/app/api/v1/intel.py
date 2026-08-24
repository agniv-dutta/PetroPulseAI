"""Anomaly + attribution endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.intelligence.pipeline import analyze_asset
from app.models import AnomalyEvent, Asset

router = APIRouter(tags=["intelligence"])


class AnomalyStatusUpdate(BaseModel):
    status: str


@router.get("/anomalies")
def list_anomalies(db: Session = Depends(get_db)) -> dict:
    events = db.execute(
        select(AnomalyEvent).order_by(AnomalyEvent.anomaly_score.desc())
    ).scalars().all()
    return {
        "rows": [
            {
                "id": e.id,
                "assetId": e.asset_id,
                "severity": e.severity,
                "anomalyScore": e.anomaly_score,
                "deviationPct": e.deviation_pct,
                "expectedBblD": e.expected_bbl_d,
                "actualBblD": e.actual_bbl_d,
                "windowStart": e.window_start.isoformat(),
                "windowEnd": e.window_end.isoformat(),
                "contributingFeatures": e.contributing_features,
                "status": e.status,
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
    allowed = {"UNACKNOWLEDGED", "INVESTIGATING", "ACKNOWLEDGED", "MONITORING", "RESOLVED"}
    if payload.status not in allowed:
        raise HTTPException(422, f"status must be one of {sorted(allowed)}")
    event = db.get(AnomalyEvent, anomaly_id)
    if not event:
        raise HTTPException(404, f"unknown anomaly {anomaly_id}")
    event.status = payload.status
    db.commit()
    return {"id": event.id, "status": event.status}


@router.get("/attribution/{asset_id}")
def attribution(asset_id: str, db: Session = Depends(get_db)) -> dict:
    asset = db.get(Asset, asset_id)
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
    asset = db.get(Asset, asset_id)
    if not asset:
        raise HTTPException(404, f"unknown asset {asset_id}")
    analysis = analyze_asset(db, asset)
    return {
        "asset_id": asset_id,
        **analysis["aips"],
        "recovery": analysis["recovery"],
        "financials": {
            "intervention_cost_usd_m": asset.intervention_cost_usd_m,
            "estimated_value_usd_m": analysis["aips"]["estimated_value_usd_m"],
            "roi_multiple": round(
                analysis["aips"]["estimated_value_usd_m"]
                / max(asset.intervention_cost_usd_m, 1e-9), 1
            ),
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
