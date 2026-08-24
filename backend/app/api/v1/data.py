"""Data pipeline endpoints: quality reporting for the unified ingestion layer."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services.data_service import DataService

router = APIRouter(prefix="/data", tags=["data"])

QUALITY_POLICY = (
    "REAL rows are stored exactly as published; absent operational fields "
    "(pressure/temperature/flow_rate/valve_status) remain NULL and are never "
    "fabricated by the ingestion layer. SYNTHETIC rows originate only from the "
    "simulation/generator pipelines. DERIVED rows are model outputs. Every row "
    "carries an explicit, CHECK-constrained source_type."
)


@router.get("/quality")
def data_quality(db: Session = Depends(get_db)) -> dict:
    """Row/asset/date-range/missingness/duplicate/source statistics."""
    report = DataService.db_quality_report(db)
    report["policy"] = QUALITY_POLICY
    return report
