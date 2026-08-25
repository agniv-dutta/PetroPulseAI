"""Forecast + attribution endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.intelligence.pipeline import analyze_asset
from app.models import Asset, ProductionHistory

router = APIRouter(prefix="/forecast", tags=["forecast"])

_ALLOWED_HORIZONS = (30, 90, 180, 365)


@router.get("/{asset_id}/{horizon_days}")
def forecast_with_horizon(
    asset_id: str,
    horizon_days: int,
    db: Session = Depends(get_db),
) -> dict:
    """Spec form: GET /api/v1/forecast/MH-07/90 (horizon in {30,90,180,365})."""
    if horizon_days not in _ALLOWED_HORIZONS:
        raise HTTPException(
            422,
            f"horizon must be one of {list(_ALLOWED_HORIZONS)}",
        )
    return forecast(asset_id=asset_id, horizon_days=horizon_days, db=db)


@router.get("/{asset_id}")
def forecast(
    asset_id: str,
    horizon_days: int = Query(90, ge=30, le=365),
    db: Session = Depends(get_db),
) -> dict:
    asset = db.execute(
        select(Asset).where(Asset.asset_id == asset_id)
    ).scalars().first()
    if not asset:
        raise HTTPException(404, f"unknown asset {asset_id}")
    analysis = analyze_asset(db, asset)
    fc = analysis["forecast"]
    months = max(min(round(horizon_days / 30.44), fc["horizon_months"]), 1)

    from app.ingestion.seed import expected_series

    history_rows = (
        db.execute(
            select(ProductionHistory)
            .where(ProductionHistory.asset_id == asset_id)
            .order_by(ProductionHistory.timestamp.desc())
            .limit(24)
        ).scalars().all()
    )[::-1]
    expected_values = expected_series(
        asset_id, [r.timestamp for r in history_rows]
    ) if history_rows else []

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
            {
                "period": r.timestamp.date().isoformat(),
                "actual": r.production,
                "expected": round(exp, 1),
            }
            for r, exp in zip(history_rows[-12:], expected_values[-12:])
        ],
        "data_source": "DERIVED (model output over synthetic-seeded history)",
    }
