"""Anomaly detection API endpoints."""

from datetime import date, datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import AnomalyEvent, AnomalyResponse, ErrorResponse
from app.services.anomaly_service import AnomalyService

router = APIRouter(prefix="/anomaly", tags=["anomaly"])


@router.get(
    "/active",
    response_model=list[AnomalyResponse],
    summary="Get active anomalies",
    description="Retrieve all active (unacknowledged) anomalies across all assets.",
    responses={
        200: {"description": "Active anomalies retrieved successfully"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
)
def get_active_anomalies(
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of anomalies to return"),
    db: Session = Depends(get_db),
) -> list[AnomalyResponse]:
    """Get all active anomalies across the portfolio."""
    try:
        from sqlalchemy import select
        from app.models.enums import AnomalyStatus
        
        stmt = (
            select(AnomalyEvent)
            .where(AnomalyEvent.status == AnomalyStatus.ACTIVE)
            .order_by(AnomalyEvent.detected_at.desc())
            .limit(limit)
        )
        anomalies = list(db.execute(stmt).scalars().all())
        
        return [
            AnomalyResponse(
                id=a.id,
                asset_id=a.asset_id,
                detected_at=a.detected_at,
                window_start=a.window_start,
                window_end=a.window_end,
                severity=a.severity,
                anomaly_score=a.anomaly_score,
                deviation_pct=a.deviation_pct,
                expected_bbl_d=a.expected_bbl_d,
                actual_bbl_d=a.actual_bbl_d,
                contributing_features=a.contributing_features or [],
                status=a.status,
            )
            for a in anomalies
        ]
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=ErrorResponse(
                error="AnomalyRetrievalError",
                message=f"Failed to retrieve active anomalies: {str(e)}",
                status_code=500,
            ).model_dump(),
        )


@router.get(
    "/{asset_id}",
    response_model=list[AnomalyResponse],
    summary="Get anomalies for asset",
    description="Retrieve anomaly events for a specific asset.",
    responses={
        200: {"description": "Anomalies retrieved successfully"},
        404: {"model": ErrorResponse, "description": "Asset not found"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
)
def get_asset_anomalies(
    asset_id: str,
    limit: int = Query(50, ge=1, le=500, description="Maximum number of anomalies to return"),
    db: Session = Depends(get_db),
) -> list[AnomalyResponse]:
    """Get anomaly events for a specific asset."""
    try:
        from app.models import Asset
        from sqlalchemy import select
        
        asset = db.get(Asset, asset_id)
        if not asset:
            raise HTTPException(
                status_code=404,
                detail=ErrorResponse(
                    error="AssetNotFound",
                    message=f"Asset {asset_id} not found",
                    status_code=404,
                ).model_dump(),
            )
        
        stmt = (
            select(AnomalyEvent)
            .where(AnomalyEvent.asset_id == asset_id)
            .order_by(AnomalyEvent.detected_at.desc())
            .limit(limit)
        )
        anomalies = list(db.execute(stmt).scalars().all())
        
        return [
            AnomalyResponse(
                id=a.id,
                asset_id=a.asset_id,
                detected_at=a.detected_at,
                window_start=a.window_start,
                window_end=a.window_end,
                severity=a.severity,
                anomaly_score=a.anomaly_score,
                deviation_pct=a.deviation_pct,
                expected_bbl_d=a.expected_bbl_d,
                actual_bbl_d=a.actual_bbl_d,
                contributing_features=a.contributing_features or [],
                status=a.status,
            )
            for a in anomalies
        ]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=ErrorResponse(
                error="AnomalyRetrievalError",
                message=f"Failed to retrieve asset anomalies: {str(e)}",
                status_code=500,
            ).model_dump(),
        )
