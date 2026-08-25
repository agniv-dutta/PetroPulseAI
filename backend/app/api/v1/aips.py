"""AIPS endpoints (spec: /aips/ranking, /aips/{asset_id}).

Delegates entirely to the intelligence pipeline; ``app.services.aips_service``
is the ONLY AIPS implementation in the platform (centralisation contract).
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.intelligence.pipeline import analyze_asset, get_portfolio_analysis
from app.models import Asset
from app.schemas.envelopes import RankingResponse

router = APIRouter(prefix="/aips", tags=["aips"])


@router.get("/ranking", response_model=RankingResponse)
def aips_ranking(db: Session = Depends(get_db)) -> dict:
    """Portfolio ranked by AIPS score (descending)."""
    ranked = get_portfolio_analysis(db)
    rows = []
    for r in ranked:
        aips = r["aips"]
        breakdown = aips.get("breakdown", {})
        rows.append({
            "rank": r["rank"],
            "assetId": r["asset"]["id"],
            "name": r["asset"]["name"],
            "field": r["asset"].get("field"),
            "basin": r["asset"].get("basin"),
            "aipsScore": aips["score"],
            "priority": aips["priority"],
            "breakdown": breakdown,
            "estimatedValueUsdM": aips.get("estimated_value_usd_m"),
            "estimatedRecoveryMmbbl": aips.get("estimated_recovery_mmbbl"),
            "anomalyScore": r.get("anomaly_score", 0.0),
            "deviationPct": r.get("deviation_pct", 0.0),
            "currentProdBblD": r.get("current_production_bbl_d"),
            "expectedProdBblD": r.get("expected_production_bbl_d"),
            "declineRatePctPerMonth": (r.get("decline") or {}).get(
                "decline_rate_current_pct_per_month"
            ),
            "recoveryOpportunityPct": breakdown.get("recovery_opportunity_pct"),
        })
    return {
        "rows": rows,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/{asset_id}")
def asset_aips(asset_id: str, db: Session = Depends(get_db)) -> dict:
    """Full AIPS breakdown for one asset: components, confidence, ROI."""
    asset = db.execute(
        select(Asset).where(Asset.asset_id == asset_id)
    ).scalars().first()
    if not asset:
        raise HTTPException(404, f"unknown asset {asset_id}")

    analysis = analyze_asset(db, asset)
    aips = analysis["aips"]
    recovery = analysis["recovery"]
    return {
        "asset_id": asset_id,
        **aips,
        "current_production_bbl_d": analysis.get("current_production_bbl_d"),
        "expected_production_bbl_d": analysis.get("expected_production_bbl_d"),
        "deviation_pct": analysis.get("deviation_pct"),
        "recovery": recovery,
        "recommendations": analysis.get("recommendations"),
        "data_source": analysis.get("data_source", "SYNTHETIC"),
        "analyzed_at": analysis.get("analyzed_at"),
    }
