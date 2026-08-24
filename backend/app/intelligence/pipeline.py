"""Portfolio analysis pipeline: per-asset ML + intelligence with result caching.

Reads canonical production_history, reconstructs the seasonal Arps expectation
as a DERIVED quantity (never stored as measured telemetry), and persists
derived outputs into forecast / anomaly / aips_scores / model_metrics.
"""

import threading
from datetime import date, datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.intelligence.attribution import attribute_deviation
from app.ingestion.catalog import CANONICAL_ASSETS
from app.ml.anomaly import ProductionAnomalyDetector, evaluate_detector
from app.ml.arps import arps_rate, fit_arps
from app.ml.forecast import ProductionForecaster
from app.models import (
    AIPSScore,
    Anomaly,
    Asset,
    Forecast,
    ModelMetric,
    ProductionHistory,
)
from app.services.aips_service import AIPSInput, calculate_aips
from app.services.recommendation_service import generate_recommendations
from app.services.recovery_service import estimate_recovery_opportunity

_lock = threading.Lock()
_cache: dict[str, dict] = {}
_cache_built_at: datetime | None = None

_CATALOG_BY_CODE = {a["id"]: a for a in CANONICAL_ASSETS}


def _add_months(d: date, n: int) -> date:
    m0 = d.year * 12 + d.month - 1 + n
    y, m = divmod(m0, 12)
    return date(y, m + 1, 1)


def _expected_values(code: str, timestamps: list[datetime], values: list[float]) -> list[float]:
    """Seasonal Arps expectation; falls back to a fitted decline for unknown codes."""
    from app.ingestion.seed import expected_series

    expected = expected_series(code, timestamps) if timestamps else []
    if expected and max(expected) > 0.0:
        return expected
    if len(values) < 6:
        return [v for v in values]
    fit = fit_arps(values)
    return [
        arps_rate(fit.qi, fit.di, fit.b, float(i)) * 1.0 for i in range(len(values))
    ]


def analyze_asset(db: Session, asset: Asset, persist: bool = True) -> dict:
    code = asset.asset_id
    history = (
        db.execute(
            select(ProductionHistory)
            .where(ProductionHistory.asset_id == code)
            .order_by(ProductionHistory.timestamp.asc())
        )
        .scalars()
        .all()
    )
    timestamps = [r.timestamp for r in history]
    values = [float(r.production) for r in history]
    expected_values = _expected_values(code, timestamps, values)
    spec = _CATALOG_BY_CODE.get(code)

    expected_last = expected_values[-1] if expected_values else 0.0
    actual_last = values[-1] if values else 0.0

    # --- Arps decline model -------------------------------------------------
    arps_result = fit_arps(values)

    # --- anomaly detection --------------------------------------------------
    hist_dicts = [
        {
            "period": ts.date().isoformat(),
            "oil_bbl_d": value,
            "expected_bbl_d": exp,
            "water_cut_pct": 0.0,
        }
        for ts, value, exp in zip(timestamps, values, expected_values)
    ]
    detector = ProductionAnomalyDetector().fit(hist_dicts)
    windows = detector.detect_windows(code, hist_dicts)
    latest_score = windows[-1].anomaly_score if windows else 0.0
    evaluation = evaluate_detector(detector, hist_dicts)

    # --- forecasting ---------------------------------------------------------
    metadata = None
    if spec:
        metadata = {
            "onstream_year": spec["onstream_year"],
            "intervention_cost_usd_m": spec["intervention_cost_usd_m"],
        }
    forecaster = ProductionForecaster(random_state=42)
    forecaster.fit(
        values,
        arps_params={"qi": arps_result.qi, "di": arps_result.di, "b": arps_result.b},
        asset_metadata=metadata,
        enable_lstm=False,  # LSTM stays opt-in; 36 monthly points is too few anyway
    )
    fc = forecaster.forecast()
    backtest = forecaster.backtest(
        values,
        arps_params={"qi": arps_result.qi, "di": arps_result.di, "b": arps_result.b},
        asset_metadata=metadata,
    )

    # --- attribution ----------------------------------------------------------
    attribution = attribute_deviation(forecaster, values, expected_last, actual_last)

    # --- recovery + AIPS (canonical services; backend source of truth) -------
    recovery = estimate_recovery_opportunity(expected_last, actual_last, latest_score)
    combined_conf = recovery.combined_confidence
    complexity = min(max(0.3 + (spec["intervention_cost_usd_m"] if spec else 1.0) / 4.0, 0.0), 1.0)
    aips = calculate_aips(AIPSInput(
        expected_bbl_d=expected_last,
        actual_bbl_d=actual_last,
        anomaly_score=latest_score,
        intervention_complexity=complexity,
        recovery=recovery,
    ))

    result = {
        "asset": {
            "id": code,
            "uuid": str(asset.id),
            "name": spec["name"] if spec else f"{asset.field_name} {code}",
            "field": asset.field_name,
            "basin": asset.basin,
            "latitude": asset.latitude,
            "longitude": asset.longitude,
            "status": asset.status,
            "onstream_year": spec["onstream_year"] if spec else None,
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
        "models_used": fc.get("models_used", []),
        "produced_by": fc.get("produced_by"),
        "backtest": backtest.get("overall"),
        "backtest_by_horizon": {k: v for k, v in backtest.items() if k != "overall"},
        "feature_importance": forecaster.feature_importance(),
        "attribution": attribution,
        "recovery": recovery.to_dict(),
        "aips": aips.to_dict(),
        "recommendations": generate_recommendations(
            deviation_pct=(actual_last - expected_last) / max(expected_last, 1e-9) * 100.0,
            anomaly_score=latest_score,
            anomaly_severity=windows[-1].severity if windows else "NORMAL",
            recovery_opportunity_pct=aips.recovery_opportunity_pct,
            estimated_volume_mmbbl=recovery.estimated_volume_mmbbl,
            combined_confidence=recovery.combined_confidence,
            intervention_complexity=complexity,
            aips_priority=aips.priority,
            asset_id=code,
        ).to_dict(),
        "data_source": "SYNTHETIC",
        "analyzed_at": datetime.now(timezone.utc).isoformat(),
    }

    if persist:
        db.add(AIPSScore(
            asset_id=code,
            score=aips.score,
            priority=aips.priority,
            loss_magnitude=round(aips.loss_magnitude_pct, 3),
            anomaly_severity=round(aips.anomaly_severity_scaled, 3),
            recovery_opportunity=round(aips.recovery_opportunity_pct, 3),
            recovery_confidence=round(recovery.combined_confidence, 4),
            intervention_complexity=round(aips.intervention_complexity_scaled, 3),
            model_version="aips-v2-approved",
        ))

        if windows:
            latest = windows[-1]
            top_feature = (
                latest.contributing_features[0]["label"]
                if latest.contributing_features else "Production below expectation"
            )
            year, month, day = (int(p) for p in str(latest.period).split("-"))
            db.add(Anomaly(
                asset_id=code,
                timestamp=datetime(year, month, day, tzinfo=timezone.utc),
                anomaly_score=latest.anomaly_score,
                severity=latest.severity,
                production_deviation=latest.deviation_pct,
                contributing_features=latest.contributing_features,
                status="UNACKNOWLEDGED",
                explanation=(
                    f"Isolation Forest flagged underperformance: {top_feature.lower()} "
                    f"(deviation {latest.deviation_pct:.1f}% vs seasonal Arps expectation). "
                    f"Derived from SYNTHETIC history."
                ),
                model_version="iso-forest-v1",
            ))

        overall = backtest.get("overall", {})
        last_month = timestamps[-1].date() if timestamps else date.today().replace(day=1)
        horizon_days = fc["horizon_months"] * 30
        residual_std = float(fc["summary"].get("residual_std", 0.0))
        for point in fc["points"]:
            confidence = max(0.3, min(0.95, 1.0 - (residual_std / max(point["forecast"], 1e-9))))
            db.add(Forecast(
                asset_id=code,
                horizon_days=horizon_days,
                forecast_value=point["forecast"],
                model_type=fc["model_name"],
                model_version="v1",
                mae=overall.get("mae"),
                rmse=overall.get("rmse"),
                r2=overall.get("r2"),
                mape=overall.get("mape"),
                confidence=round(confidence, 3),
                forecast_date=_add_months(last_month, point["step"]),
            ))

        evaluation_dataset = "synthetic-demo-backtest"
        if overall:
            for metric_name in ("mae", "rmse", "r2", "mape"):
                db.add(ModelMetric(
                    model_name=fc["model_name"],
                    model_version="v1",
                    metric_name=metric_name,
                    metric_value=float(overall[metric_name]),
                    evaluation_dataset=evaluation_dataset,
                    sample_count=int(overall.get("folds", 0)),
                ))
        if evaluation:
            for metric_name, metric_value in evaluation.to_dict().items():
                db.add(ModelMetric(
                    model_name="Anomaly Detector",
                    model_version="v1",
                    metric_name=metric_name,
                    metric_value=float(metric_value),
                    evaluation_dataset=evaluation_dataset,
                    sample_count=len(history),
                ))

        db.commit()

    return result


def get_portfolio_analysis(db: Session, force_refresh: bool = False) -> list[dict]:
    global _cache, _cache_built_at
    with _lock:
        assets = list(db.execute(select(Asset)).scalars().all())
        if force_refresh or not _cache or len(_cache) < len(assets):
            results = []
            for asset in sorted(assets, key=lambda a: a.asset_id):
                res = _cache.get(asset.asset_id) or analyze_asset(db, asset)
                _cache[asset.asset_id] = res
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
