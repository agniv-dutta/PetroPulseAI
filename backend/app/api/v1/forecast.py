"""Forecast + attribution endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.intelligence.pipeline import analyze_asset
from app.models import Asset

router = APIRouter(prefix="/forecast", tags=["forecast"])


@router.get("/{asset_id}")
def forecast(
    asset_id: str,
    horizon_days: int = Query(90, ge=30, le=365),
    db: Session = Depends(get_db),
) -> dict:
    asset = db.get(Asset, asset_id)
    if not asset:
        raise HTTPException(404, f"unknown asset {asset_id}")
    analysis = analyze_asset(db, asset)
    fc = analysis["forecast"]
    months = max(min(round(horizon_days / 30.44), fc["horizon_months"]), 1)

    from sqlalchemy import select as _select
    from app.models import MonthlyProduction
    history_rows = (
        db.execute(
            _select(MonthlyProduction)
            .where(MonthlyProduction.asset_id == asset_id)
            .order_by(MonthlyProduction.period.desc())
            .limit(24)
        ).scalars().all()
    )[::-1]

    return {
        "asset_id": asset_id,
        "horizon_days": horizon_days,
        "model_name": fc["model_name"],
        "points": fc["points"][:months],
        "summary": fc["summary"],
        "backtest_overall": analysis["backtest"],
        "backtest_by_horizon": analysis["backtest_by_horizon"],
        "feature_importance": analysis["feature_importance"],
        "arps_fit": analysis["decline"],
        "history_tail": [
            {"period": r.period.isoformat(), "actual": r.oil_bbl_d, "expected": r.expected_bbl_d}
            for r in history_rows[-12:]
        ],
        "data_source": "DERIVED (model output over synthetic-seeded history)",
    }
