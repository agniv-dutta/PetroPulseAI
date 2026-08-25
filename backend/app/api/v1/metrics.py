"""Model quality metrics endpoints (spec: /metrics/forecast, /metrics/anomaly).

Forecast metrics come from the forecaster's rolling-origin backtest; anomaly
metrics come from the Isolation Forest evaluation against the documented
deviation-based reference labeling. Both are computed by the intelligence
pipeline (single source of truth) over the portfolio cache.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.intelligence.pipeline import get_portfolio_analysis
from app.schemas.envelopes import (
    AnomalyMetricsEnvelope,
    ForecastMetricsEnvelope,
)

router = APIRouter(prefix="/metrics", tags=["metrics"])

_METRIC_KEYS = ("mae", "rmse", "r2", "mape")


@router.get("/forecast", response_model=ForecastMetricsEnvelope)
def forecast_metrics(db: Session = Depends(get_db)) -> dict:
    """Backtested forecast accuracy across horizons for the portfolio."""
    ranked = get_portfolio_analysis(db)
    if not ranked:
        return {"model": None, "overall": {}, "horizons": [], "assets": 0}

    overall_acc: dict[str, list[float]] = {k: [] for k in _METRIC_KEYS}
    horizon_acc: dict[str, dict[str, list[float]]] = {}
    model_name = ranked[0]["forecast"].get("model_name")

    for r in ranked:
        overall = (r.get("backtest") or {})
        for k in _METRIC_KEYS:
            if overall.get(k) is not None:
                overall_acc[k].append(float(overall[k]))
        for hz, metrics in (r.get("backtest_by_horizon") or {}).items():
            bucket = horizon_acc.setdefault(hz, {k: [] for k in _METRIC_KEYS})
            for k in _METRIC_KEYS:
                if metrics.get(k) is not None:
                    bucket[k].append(float(metrics[k]))

    def _mean(values: list[float]) -> float | None:
        return round(sum(values) / len(values), 4) if values else None

    return {
        "model": model_name,
        "dataset": "synthetic-demo-backtest (rolling origin)",
        "overall": {
            **{k: _mean(v) for k, v in overall_acc.items()},
            "folds": ranked[0].get("backtest", {}).get("folds"),
            "asset_count": max(len(v) for v in overall_acc.values()) if any(overall_acc.values()) else 0,
        },
        "horizons": [
            {"horizon": hz, **{k: _mean(vals[k]) for k in _METRIC_KEYS}}
            for hz, vals in sorted(horizon_acc.items())
        ],
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/anomaly", response_model=AnomalyMetricsEnvelope)
def anomaly_metrics(db: Session = Depends(get_db)) -> dict:
    """Isolation Forest detection quality aggregated over the portfolio."""
    ranked = get_portfolio_analysis(db)
    keys = ("precision", "recall", "f1", "roc_auc", "accuracy")
    acc: dict[str, list[float]] = {k: [] for k in keys}
    per_asset: list[dict] = []
    samples = 0

    for r in ranked:
        m = r.get("detector_metrics")
        if not m:
            continue
        per_asset.append({
            "assetId": r["asset"]["id"],
            **{k: m.get(k) for k in keys},
            "sample_count": m.get("sample_count"),
        })
        samples += int(m.get("sample_count") or 0)
        for k in keys:
            if m.get(k) is not None:
                acc[k].append(float(m[k]))

    aggregate = {
        k: round(sum(v) / len(v), 4) if v else None
        for k, v in acc.items()
    }
    aggregate["sample_count"] = samples
    aggregate["method"] = (
        "Isolation Forest vs deviation-based reference labels "
        "(shortfall >= 10% vs seasonal Arps expectation)"
    )

    return {
        "aggregate": aggregate,
        "per_asset": sorted(per_asset, key=lambda x: x["assetId"]),
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
