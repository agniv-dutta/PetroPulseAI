"""Forecast API endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Path, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Asset, MonthlyProduction, ForecastResponse, ForecastPoint, ForecastMetrics, ErrorResponse
from app.services.forecast_service import ForecastService

router = APIRouter(prefix="/forecast", tags=["forecast"])


@router.get(
    "/{asset_id}/{horizon}",
    response_model=ForecastResponse,
    summary="Get production forecast",
    description="Generate production forecast for an asset with confidence intervals and performance metrics.",
    responses={
        200: {"description": "Forecast generated successfully"},
        400: {"model": ErrorResponse, "description": "Invalid horizon value"},
        404: {"model": ErrorResponse, "description": "Asset not found"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
)
def get_forecast(
    asset_id: str = Path(..., description="Asset ID"),
    horizon: int = Path(..., description="Forecast horizon in days (30, 90, 180, 365)"),
    db: Session = Depends(get_db),
) -> ForecastResponse:
    """Get production forecast for an asset."""
    # Validate horizon
    valid_horizons = [30, 90, 180, 365]
    if horizon not in valid_horizons:
        raise HTTPException(
            status_code=400,
            detail=ErrorResponse(
                error="InvalidHorizon",
                message=f"Horizon must be one of: {valid_horizons}",
                status_code=400,
                details={"valid_horizons": valid_horizons},
            ).model_dump(),
        )
    
    try:
        asset = db.get(Asset,asset_id)
        if not asset:
            raise HTTPException(
                status_code=404,
                detail=ErrorResponse(
                    error="AssetNotFound",
                    message=f"Asset {asset_id} not found",
                    status_code=404,
                ).model_dump(),
            )
        
        # Get historical production data
        from sqlalchemy import select
        stmt = (
            select(MonthlyProduction)
            .where(MonthlyProduction.asset_id == asset_id)
            .order_by(MonthlyProduction.period.desc())
            .limit(36)
        )
        history_rows = list(db.execute(stmt).scalars().all())[::-1]
        
        if len(history_rows) < 8:
            raise HTTPException(
                status_code=400,
                detail=ErrorResponse(
                    error="InsufficientData",
                    message=f"Insufficient production history for forecasting (need at least 8 months, have {len(history_rows)})",
                    status_code=400,
                ).model_dump(),
            )
        
        # Generate forecast using service
        forecast_run = ForecastService.create_forecast(db, asset_id, horizon_days=horizon)
        
        # Extract forecast points
        forecast_points = []
        for point in forecast_run.series:
            forecast_points.append(
                ForecastPoint(
                    step=point.get("step", 0),
                    forecast=point.get("forecast", 0.0),
                    lower=point.get("lower", 0.0),
                    upper=point.get("upper", 0.0),
                )
            )
        
        # Extract metrics
        metrics_data = forecast_run.metrics or {}
        forecast_metrics = ForecastMetrics(
            mae=metrics_data.get("mae", 0.0),
            rmse=metrics_data.get("rmse", 0.0),
            r2=metrics_data.get("r2", 0.0),
            mape=metrics_data.get("mape", 0.0),
        )
        
        # Build historical points
        historical_points = [
            {
                "period": p.period.isoformat(),
                "oil_bbl_d": p.oil_bbl_d,
                "expected_bbl_d": p.expected_bbl_d,
            }
            for p in history_rows
        ]
        
        # Calculate confidence (based on R2 and data quality)
        confidence = min(100.0, max(0.0, forecast_metrics.r2 * 100))
        
        return ForecastResponse(
            asset_id=asset_id,
            horizon=horizon,
            forecast=forecast_points,
            model=forecast_run.params.get("model_name", "gradient_boosting"),
            confidence=round(confidence, 2),
            metrics=forecast_metrics,
            historical_points=historical_points,
            forecast_points=forecast_points,
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=ErrorResponse(
                error="ForecastError",
                message=f"Failed to generate forecast: {str(e)}",
                status_code=500,
            ).model_dump(),
        )
