"""Asset endpoints: catalogue, leaderboard, full detail bundle."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.intelligence.pipeline import analyze_asset, get_portfolio_analysis
from app.models import Asset, MonthlyProduction

router = APIRouter(prefix="/assets", tags=["assets"])


@router.get("")
def list_assets(db: Session = Depends(get_db)) -> list[dict]:
    assets = db.execute(select(Asset).order_by(Asset.id)).scalars().all()
    return [
        {
            "id": a.id, "name": a.name, "field": a.field, "basin": a.basin,
            "latitude": a.latitude, "longitude": a.longitude,
            "status": a.status, "onstream_year": a.onstream_year,
        }
        for a in assets
    ]


@router.get("/leaderboard")
def leaderboard(
    refresh: bool = Query(False, description="force recompute of ML scores"),
    db: Session = Depends(get_db),
) -> dict:
    ranked = get_portfolio_analysis(db, force_refresh=refresh)
    rows = []
    for r in ranked:
        aips = r["aips"]
        rows.append({
            "id": r["asset"]["id"],
            "name": r["asset"]["name"],
            "field": r["asset"]["field"],
            "basin": r["asset"]["basin"],
            "currentProd": round(r["current_production_bbl_d"] / 1000.0, 3),  # MMBL-ish scale used by UI
            "expectedProd": round(r["expected_production_bbl_d"] / 1000.0, 3),
            "deviation": r["deviation_pct"],
            "declineRate": r["decline"]["decline_rate_current_pct_per_month"],
            "severity": (
                "CRITICAL" if r["anomaly_score"] >= 0.85
                else "ALERT" if r["anomaly_score"] >= 0.70
                else "WATCH" if r["anomaly_score"] >= 0.50
                else "NORMAL"
            ),
            "anomalyScore": r["anomaly_score"],
            "aipsScore": aips["score"],
            "priority": aips["priority"],
            "recoveryPotential": r["recovery"]["estimated_recovery_mmbbl"],
            "rank": r["rank"],
            "dataSource": r["data_source"],
        })
    generated_at = next(iter(ranked), {}).get("analyzed_at")
    return {"rows": rows, "count": len(rows), "generated_at": generated_at}


@router.get("/{asset_id}/history")
def asset_history(
    asset_id: str,
    months: int = Query(24, ge=6, le=120),
    db: Session = Depends(get_db),
) -> list[dict]:
    asset = db.get(Asset, asset_id)
    if not asset:
        raise HTTPException(404, f"unknown asset {asset_id}")
    rows = (
        db.execute(
            select(MonthlyProduction)
            .where(MonthlyProduction.asset_id == asset_id)
            .order_by(MonthlyProduction.period.desc())
            .limit(months)
        ).scalars().all()
    )[::-1]
    return [
        {
            "period": r.period.isoformat(),
            "actual": r.oil_bbl_d,
            "expected": r.expected_bbl_d,
            "gas_mmcf_d": r.gas_mmcf_d,
            "waterCutPct": r.water_cut_pct,
            "source": r.source,
        }
        for r in rows
    ]


@router.get("/{asset_id}")
def asset_detail(asset_id: str, db: Session = Depends(get_db)) -> dict:
    asset = db.get(Asset, asset_id)
    if not asset:
        raise HTTPException(404, f"unknown asset {asset_id}")
    analysis = analyze_asset(db, asset)
    history = asset_history(asset_id, months=24, db=db)
    return {
        **analysis["asset"],
        **{k: v for k, v in analysis.items() if k != "asset"},
        "historical24m": history,
    }
