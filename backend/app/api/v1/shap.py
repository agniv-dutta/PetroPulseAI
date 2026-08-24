"""SHAP explanation API endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Asset, ForecastRun, SHAPExplanationResponse, ErrorResponse
from app.services.shap_service import SHAPService

router = APIRouter(prefix="/shap", tags=["shap"])


@router.get(
    "/{asset_id}",
    response_model=SHAPExplanationResponse,
    summary="Get SHAP explanation for asset",
    description="Generate SHAP (SHapley Additive exPlanations) values for model interpretability.",
    responses={
        200: {"description": "SHAP explanation generated successfully"},
        404: {"model": ErrorResponse, "description": "Asset or forecast not found"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
)
def get_shap_explanation(
    asset_id: str,
    db: Session = Depends(get_db),
) -> SHAPExplanationResponse:
    """Generate SHAP explanation for an asset's forecast."""
    try:
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
        
        # Get latest forecast run
        from sqlalchemy import select
        stmt = (
            select(ForecastRun)
            .where(ForecastRun.asset_id == asset_id)
            .order_by(ForecastRun.created_at.desc())
            .first()
        )
        
        forecast_run = db.execute(stmt).scalar_one_or_none()
        if not forecast_run:
            raise HTTPException(
                status_code=404,
                detail=ErrorResponse(
                    error="ForecastNotFound",
                    message=f"No forecast found for asset {asset_id}",
                    status_code=404,
                ).model_dump(),
            )
        
        # Generate SHAP explanation
        explanation = SHAPService.generate_explanation(db, asset_id, forecast_run.id)
        
        return SHAPExplanationResponse(
            asset_id=asset_id,
            forecast_run_id=forecast_run.id,
            shap_values=explanation.get("shap_values", []),
            feature_names=explanation.get("feature_names", []),
            base_value=explanation.get("base_value", 0.0),
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=ErrorResponse(
                error="SHAPError",
                message=f"Failed to generate SHAP explanation: {str(e)}",
                status_code=500,
            ).model_dump(),
        )
