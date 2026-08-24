"""Portfolio analysis pipeline: per-asset ML + intelligence with result caching."""

import threading
from datetime import date, datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.intelligence.aips import AIPSInput, calculate_aips
from app.intelligence.attribution import attribute_deviation
from app.intelligence.recovery import estimate_recovery
from app.ml.anomaly import ProductionAnomalyDetector, evaluate_detector
from app.ml.arps import fit_arps
from app.ml.forecast import ProductionForecaster
from app.models import AnomalyEvent, Asset, ForecastRun, MonthlyProduction, ScoreRun

_lock = threading.Lock()
_cache: dict[str, dict] = {}
_cache_built_at: datetime | None = None


def _load_history(db: Session, months: int = 24) -> list[MonthlyProduction]:
    return list(
        db.execute(
            select(MonthlyProduction)
            .order_by(MonthlyProduction.period.desc())
            .limit(months)
        ).scalars()
    )[::-1]


def analyze_asset(db: Session, asset: Asset, persist: bool = True) -> dict:
    history = (
        db.execute(
            select(MonthlyProduction)
            .where(MonthlyProduction.asset_id == asset.id)
            .order_by(MonthlyProduction.period.asc())
        )
        .scalars()
        .all()
    )
    values = [float(r.oil_bbl_d) for r in history]
    expected_last = float(history[-1].expected_bbl_d) if history else 0.0
    actual_last = values[-1] if values else 0.0

    # --- Arps decline model -------------------------------------------------
    arps_result = fit_arps(values)

    # --- anomaly detection --------------------------------------------------
    hist_dicts = [
        {
            "period": r.period.isoformat(),
            "oil_bbl_d": float(r.oil_bbl_d),
            "expected_bbl_d": float(r.expected_bbl_d),
            "water_cut_pct": float(r.water_cut_pct),
        }
        for r in history
    ]
    detector = ProductionAnomalyDetector().fit(hist_dicts)
    windows = detector.detect_windows(asset.id, hist_dicts)
    latest_score = windows[-1].anomaly_score if windows else 0.0
    evaluation = evaluate_detector(detector, hist_dicts)

    # --- forecasting ---------------------------------------------------------
    forecaster = ProductionForecaster().fit(values)
    fc = forecaster.forecast(
        horizon_months=6,
        arps_params={"qi": arps_result.qi, "di": arps_result.di, "b": arps_result.b},
    )
    backtest = forecaster.backtest(values)

    # --- attribution ----------------------------------------------------------
    attribution = attribute_deviation(forecaster, values, expected_last, actual_last)

    # --- recovery + AIPS -------------------------------------------------------
    gap_pct = abs(expected_last - actual_last) / max(expected_last, 1e-9) * 100.0
    recovery = estimate_recovery(expected_last, actual_last, latest_score)
    combined_conf = recovery.combined_confidence
    aips = calculate_aips(AIPSInput(
        expected_bbl_d=expected_last,
        actual_bbl_d=actual_last,
        anomaly_score=latest_score,
        recovery_gap_pct=gap_pct,
        combined_confidence=combined_conf,
        complexity=min(max(0.3 + asset.intervention_cost_usd_m / 4.0, 0.0), 1.0),
    ))

    result = {
        "asset": {
            "id": asset.id,
            "name": asset.name,
            "field": asset.field,
            "basin": asset.basin,
            "latitude": asset.latitude,
            "longitude": asset.longitude,
            "status": asset.status,
            "onstream_year": asset.onstream_year,
        },
        "current_production_bbl_d": round(actual_last, 1),
        "expected_production_bbl_d": round(expected_last, 1),
        "deviation_pct": round(
            (actual_last - expected_last) / max(expected_last, 1e-9) * 100.0, 2
        ),
        "decline": arps_result.to_dict(),
        "anomaly_score": round(latest_score, 3),
        "anomaly_windows": [w.to_dict() for w in windows[-6:]],
        "detector_metrics": evaluation.to_dict() if evaluation else None,
        "forecast": fc,
        "backtest": backtest.get("overall"),
        "backtest_by_horizon": {k: v for k, v in backtest.items() if k != "overall"},
        "feature_importance": forecaster.feature_importance(),
        "attribution": attribution,
        "recovery": recovery.to_dict(),
        "aips": aips.to_dict(),
        "data_source": "SYNTHETIC",
        "analyzed_at": datetime.now(timezone.utc).isoformat(),
    }

    if persist:
        db.add(ScoreRun(
            asset_id=asset.id, aips_score=aips.score, priority=aips.priority,
            breakdown=result["aips"],
        ))
        if windows:
            latest = windows[-1]
            existing = db.get(AnomalyEvent, f"{asset.id}-LATEST")
            event = existing or AnomalyEvent(id=f"{asset.id}-LATEST", asset_id=asset.id)
            event.severity = latest.severity
            event.anomaly_score = latest.anomaly_score
            event.deviation_pct = latest.deviation_pct
            event.expected_bbl_d = latest.expected_bbl_d
            event.actual_bbl_d = latest.actual_bbl_d
            event.window_start = date.fromisoformat(windows[0].period)
            event.window_end = date.fromisoformat(latest.period)
            event.contributing_features = latest.contributing_features
            event.detected_at = datetime.now(timezone.utc)
            db.add(event)
        db.add(ForecastRun(
            asset_id=asset.id, model_name=fc["model_name"], horizon_days=180,
            metrics=backtest.get("overall", {}),
            params={"qi": arps_result.qi, "di": arps_result.di, "b": arps_result.b},
            series=fc["points"], feature_importance=forecaster.feature_importance(),
        ))
        db.commit()

    return result


def get_portfolio_analysis(db: Session, force_refresh: bool = False) -> list[dict]:
    global _cache, _cache_built_at
    with _lock:
        assets = list(db.execute(select(Asset)).scalars().all())
        if force_refresh or not _cache or len(_cache) < len(assets):
            results = []
            for asset in sorted(assets, key=lambda a: a.id):
                res = _cache.get(asset.id) or analyze_asset(db, asset)
                _cache[asset.id] = res
                results.append(res)
            _cache_built_at = datetime.now(timezone.utc)
        ranked = sorted(_cache.values(), key=lambda r: -r["aips"]["score"])
        for rank, row in enumerate(ranked, start=1):
            row["rank"] = rank
        return ranked


def invalidate_cache() -> None:
    global _cache, _cache_built_at
    with _lock:
        _cache = {}
        _cache_built_at = None


def warm_cache(db: Session) -> int:
    rows = get_portfolio_analysis(db)
    return len(rows)


def settings_snapshot() -> dict:
    return {"history_months": settings.seed_history_months}
