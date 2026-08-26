"""Data pipeline endpoints: quality reporting, data sources, and provenance."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import DataSource
from app.services.data_service import DataService

router = APIRouter(prefix="/data", tags=["data"])

QUALITY_POLICY = (
    "REAL rows are stored exactly as published; absent operational fields "
    "(pressure/temperature/flow_rate/valve_status) remain NULL and are never "
    "fabricated by the ingestion layer. SYNTHETIC rows originate only from the "
    "simulation/generator pipelines. DERIVED rows are model outputs. Every row "
    "carries an explicit, CHECK-constrained source_type."
)

# Static provenance metadata for each source type.  Every piece of data the
# backend returns must carry one of these labels so the frontend can render the
# correct badge.  Synthetic values MUST NEVER be labeled REAL.

SOURCE_TYPE_PROVENANCE = {
    "REAL": {
        "label": "REAL",
        "color": "#00D966",
        "disclaimer": (
            "Published open-government data (OGD/PPAC/DGH). "
            "Reference context only; not raw operator telemetry."
        ),
    },
    "SYNTHETIC": {
        "label": "SYNTHETIC",
        "color": "#FF9000",
        "disclaimer": (
            "Generated from statistical models for demonstration. "
            "NOT actual ONGC SCADA telemetry."
        ),
    },
    "DERIVED": {
        "label": "DERIVED",
        "color": "#C7F700",
        "disclaimer": (
            "Model output (forecasts, anomaly scores, AIPS, SHAP). "
            "Trained/evaluated on SYNTHETIC data."
        ),
    },
}


@router.get("/sources")
def data_sources(db: Session = Depends(get_db)) -> dict:
    """List all registered data sources with full provenance metadata."""
    rows = db.execute(select(DataSource).order_by(DataSource.source_type, DataSource.source_name)).scalars().all()
    return {
        "rows": [
            {
                "dataset": r.dataset_name,
                "provider": r.source_name,
                "sourceType": r.source_type,
                "coverage": r.coverage,
                "granularity": r.update_frequency,
                "limitations": r.description,
                "lastUpdated": r.last_updated.isoformat(),
                "url": r.url,
                "provenance": SOURCE_TYPE_PROVENANCE.get(r.source_type, {}),
            }
            for r in rows
        ],
        "count": len(rows),
        "policy": QUALITY_POLICY,
    }


@router.get("/provenance")
def provenance_summary(db: Session = Depends(get_db)) -> dict:
    """Aggregate provenance summary: what percentage of data is REAL vs SYNTHETIC vs DERIVED."""
    from sqlalchemy import func
    from app.models import ProductionHistory

    total = int(db.scalar(select(func.count()).select_from(ProductionHistory)) or 0)

    distribution = {}
    if total > 0:
        rows = db.execute(
            select(ProductionHistory.source_type, func.count())
            .group_by(ProductionHistory.source_type)
        ).all()
        distribution = {st: int(n) for st, n in rows}

    return {
        "totalRows": total,
        "distribution": distribution,
        "percentages": {
            st: round((count / max(total, 1)) * 100, 1)
            for st, count in distribution.items()
        },
        "sourceTypes": SOURCE_TYPE_PROVENANCE,
        "policy": QUALITY_POLICY,
        "enforcement": (
            "Every observation carries a CHECK-constrained source_type. "
            "The backend API assigns provenance labels from the source_type column; "
            "synthetic data can NEVER be labeled REAL."
        ),
        "generatedAt": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/quality")
def data_quality(db: Session = Depends(get_db)) -> dict:
    """Row/asset/date-range/missingness/duplicate/source statistics."""
    report = DataService.db_quality_report(db)
    report["policy"] = QUALITY_POLICY
    return report
