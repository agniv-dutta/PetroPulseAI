"""Anomaly endpoints (spec: /anomaly/active, /anomaly/{asset_id}).

Thin wrappers over the intelligence pipeline - the pipeline (Isolation
Forest + seasonal Arps expectation) is the single source of truth for
every anomaly score and severity band surfaced here.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.intelligence.pipeline import analyze_asset, get_portfolio_analysis
from app.ml.anomaly import severity_for_score
from app.models import Asset
from app.schemas.envelopes import (
    AnomalyActiveResponse,
    AnomalyAssetResponse,
)

router = APIRouter(prefix="/anomaly", tags=["anomaly"])


def _latest_window(analysis: dict) -> dict | None:
    windows = analysis.get("anomaly_windows") or []
    return windows[-1] if windows else None


@router.get("/active", response_model=AnomalyActiveResponse)
def active_anomalies(db: Session = Depends(get_db)) -> dict:
    """All portfolio assets whose latest anomaly score is >= WATCH."""
    ranked = get_portfolio_analysis(db)
    rows = []
    for r in ranked:
        score = float(r.get("anomaly_score", 0.0))
        severity = severity_for_score(score)
        if severity == "NORMAL":
            continue
        window = _latest_window(r)
        rows.append({
            "assetId": r["asset"]["id"],
            "assetName": r["asset"]["name"],
            "field": r["asset"].get("field"),
            "basin": r["asset"].get("basin"),
            "severity": severity,
            "anomalyScore": round(score, 3),
            "deviationPct": r.get("deviation_pct", 0.0),
            "expectedBblD": r.get("expected_production_bbl_d"),
            "actualBblD": r.get("current_production_bbl_d"),
            "contributingFeatures": (window or {}).get("contributing_features", []),
            "detectedAt": r.get("analyzed_at"),
            "aipsPriority": r["aips"]["priority"],
            "status": "ACTIVE",
        })
    rows.sort(key=lambda x: -x["anomalyScore"])
    return {
        "rows": rows,
        "count": len(rows),
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/{asset_id}", response_model=AnomalyAssetResponse)
def asset_anomalies(asset_id: str, db: Session = Depends(get_db)) -> dict:
    asset = db.execute(
        select(Asset).where(Asset.asset_id == asset_id)
    ).scalars().first()
    if not asset:
        raise HTTPException(404, f"unknown asset {asset_id}")

    analysis = analyze_asset(db, asset)
    score = float(analysis.get("anomaly_score", 0.0))
    window = _latest_window(analysis)
    return {
        "asset_id": asset_id,
        "severity": severity_for_score(score),
        "anomaly_score": round(score, 3),
        "deviation_pct": analysis.get("deviation_pct", 0.0),
        "windows": analysis.get("anomaly_windows", []),
        "detector_metrics": analysis.get("detector_metrics"),
        "explanation": (
            (window or {}).get("contributing_features")
            or [{"label": "No anomaly flagged for this asset", "importance": 0.0}]
        ),
        "data_source": analysis.get("data_source", "SYNTHETIC"),
        "analyzed_at": analysis.get("analyzed_at"),
    }
