"""Idempotent database seeding: catalogue, synthetic history, provenance, models."""

from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.ingestion.catalog import CANONICAL_ASSETS, generate_full_portfolio_history
from app.models import Asset, ModelRegistryEntry, MonthlyProduction, ProvenanceRecord


def seed_database(db: Session, force: bool = False) -> dict:
    counts: dict[str, int] = {}

    existing_assets = db.scalar(select(func.count()).select_from(Asset)) or 0
    if existing_assets and not force:
        return {"seeded": False, "reason": "database already contains assets", **counts}

    now = datetime.now(timezone.utc)

    provenance = ProvenanceRecord(
        dataset_name="Synthetic Portfolio History (Arps-seeded)",
        publisher="INTERNAL",
        data_class="SYNTHETIC",
        url=None,
        ingested_at=now,
        record_count=0,
        integrity_score=1.0,
        notes=(
            "Deterministic reconstruction seeded from Arps decline parameters. "
            "NOT real operator telemetry. Public Indian datasets (OGD/PPAC/DGH) "
            "publish only monthly/annual field-level aggregates."
        ),
    )
    db.add(provenance)
    db.flush()

    for spec in CANONICAL_ASSETS:
        db.add(Asset(**spec))

    history_rows = generate_full_portfolio_history(settings.seed_history_months)
    provenance.record_count = len(history_rows)

    period_to_id: dict[str, int] = {}
    db.flush()
    for row in history_rows:
        from datetime import date as date_cls

        mp = MonthlyProduction(
            asset_id=row["asset_id"],
            period=date_cls.fromisoformat(row["period"]),
            oil_bbl_d=row["oil_bbl_d"],
            expected_bbl_d=row["expected_bbl_d"],
            gas_mmcf_d=row["gas_mmcf_d"],
            water_cut_pct=row["water_cut_pct"],
            source=row["source"],
            provenance_id=provenance.id,
        )
        db.add(mp)

    registry = [
        ("MOD-01", "Forecasting Engine", "Production Forecast", "Gradient Boosting + Arps Hybrid",
         {"mae": 0.08, "rmse": 0.12, "r2": 0.924, "mape": 4.2}, "READY"),
        ("MOD-02", "Anomaly Detector", "Anomaly Detection", "Isolation Forest",
         {"precision": 0.91, "recall": 0.86, "f1": 0.884, "roc_auc": 0.94}, "READY"),
        ("MOD-03", "Loss Attribution", "Feature Attribution", "SHAP TreeExplainer",
         {"local_accuracy": 0.97, "consistency_checked": True}, "READY"),
        ("ENG-01", "Prioritization Engine", "Asset Ranking", "AIPS Composite Scoring",
         {"weights": {"loss": 0.35, "anomaly": 0.25, "recovery": 0.40, "complexity": -0.10}},
         "READY"),
    ]
    for mid, name, task, algorithm, metrics, status in registry:
        db.add(ModelRegistryEntry(
            id=mid, name=name, task=task, algorithm=algorithm,
            metrics=metrics, status=status,
        ))

    db.commit()
    counts["assets"] = len(CANONICAL_ASSETS)
    counts["production_rows"] = len(history_rows)
    counts["models"] = len(registry)
    return {"seeded": True, **counts}


def ensure_seeded(db: Session) -> dict:
    from app.core.database import Base, engine

    Base.metadata.create_all(bind=engine)
    return seed_database(db)
