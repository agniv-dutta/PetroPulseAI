"""Asset endpoints: catalogue, leaderboard, full detail bundle."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.ingestion.catalog import CANONICAL_ASSETS
from app.intelligence.pipeline import analyze_asset, get_portfolio_analysis
from app.models import Asset, ProductionHistory

router = APIRouter(prefix="/assets", tags=["assets"])

_CATALOG_BY_CODE = {a["id"]: a for a in CANONICAL_ASSETS}


def _get_asset(db: Session, asset_id: str) -> Asset | None:
    return db.execute(
        select(Asset).where(Asset.asset_id == asset_id)
    ).scalars().first()


@router.get("")
def list_assets(db: Session = Depends(get_db)) -> list[dict]:
    assets = db.execute(select(Asset).order_by(Asset.asset_id)).scalars().all()
    rows = []
    for a in assets:
        spec = _CATALOG_BY_CODE.get(a.asset_id, {})
        rows.append({
            "id": a.asset_id,
            "uuid": str(a.id),
            "name": spec.get("name", f"{a.field_name} {a.asset_id}"),
            "field": a.field_name,
            "basin": a.basin,
            "latitude": a.latitude,
            "longitude": a.longitude,
            "status": a.status,
            "onstream_year": spec.get("onstream_year"),
        })
    return rows


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
    if not _get_asset(db, asset_id):
        raise HTTPException(404, f"unknown asset {asset_id}")
    from app.ingestion.seed import expected_series

    rows = (
        db.execute(
            select(ProductionHistory)
            .where(ProductionHistory.asset_id == asset_id)
            .order_by(ProductionHistory.timestamp.desc())
            .limit(months)
        ).scalars().all()
    )[::-1]
    expected_values = expected_series(
        asset_id, [r.timestamp for r in rows]
    ) if rows else []
    output = []
    for r, exp in zip(rows, expected_values):
        output.append({
            "period": r.timestamp.date().isoformat(),
            "actual": r.production,
            "expected": round(exp, 1),
            "pressure_bar": r.pressure,
            "temperature_c": r.temperature,
            "flowRate": r.flow_rate,
            "valveStatus": r.valve_status,
            "source": r.source_type,
        })
    return output


@router.get("/{asset_id}")
def asset_detail(asset_id: str, db: Session = Depends(get_db)) -> dict:
    asset = _get_asset(db, asset_id)
    if not asset:
        raise HTTPException(404, f"unknown asset {asset_id}")
    analysis = analyze_asset(db, asset)
    history = asset_history(asset_id, months=24, db=db)
    return {
        **analysis["asset"],
        **{k: v for k, v in analysis.items() if k != "asset"},
        "historical24m": history,
    }
