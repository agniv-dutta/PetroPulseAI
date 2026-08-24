"""Asset API endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Asset, MonthlyProduction, AssetResponse, ErrorResponse
from app.services.asset_service import AssetService

router = APIRouter(prefix="/assets", tags=["assets"])


@router.get(
    "",
    response_model=list[AssetResponse],
    summary="List all assets",
    description="Retrieve a list of all assets in the system with basic information.",
    responses={
        200: {"description": "List of assets retrieved successfully"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
)
def list_assets(
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of assets to return"),
    offset: int = Query(0, ge=0, description="Number of assets to skip"),
    db: Session = Depends(get_db),
) -> list[AssetResponse]:
    """List all assets with pagination support."""
    try:
        assets = AssetService.get_assets(db, limit=limit, offset=offset)
        return [
            AssetResponse(
                id=a.id,
                name=a.name,
                field=a.field,
                basin=a.basin,
                latitude=a.latitude,
                longitude=a.longitude,
                onstream_year=a.onstream_year,
                status=a.status,
                baseline_qi=a.baseline_qi,
                baseline_di=a.baseline_di,
                baseline_b=a.baseline_b,
                operating_cost_usd_m=a.operating_cost_usd_m,
                intervention_cost_usd_m=a.intervention_cost_usd_m,
            )
            for a in assets
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve assets: {str(e)}")


@router.get(
    "/{asset_id}",
    response_model=AssetResponse,
    summary="Get asset details",
    description="Retrieve detailed information for a specific asset.",
    responses={
        200: {"description": "Asset details retrieved successfully"},
        404: {"model": ErrorResponse, "description": "Asset not found"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
)
def get_asset(asset_id: str, db: Session = Depends(get_db)) -> AssetResponse:
    """Get detailed information for a specific asset."""
    try:
        asset = AssetService.get_asset(db, asset_id)
        if not asset:
            raise HTTPException(
                status_code=404,
                detail=ErrorResponse(
                    error="AssetNotFound",
                    message=f"Asset {asset_id} not found",
                    status_code=404,
                ).model_dump(),
            )
        return AssetResponse(
            id=asset.id,
            name=asset.name,
            field=asset.field,
            basin=asset.basin,
            latitude=asset.latitude,
            longitude=asset.longitude,
            onstream_year=asset.onstream_year,
            status=asset.status,
            baseline_qi=asset.baseline_qi,
            baseline_di=asset.baseline_di,
            baseline_b=asset.baseline_b,
            operating_cost_usd_m=asset.operating_cost_usd_m,
            intervention_cost_usd_m=asset.intervention_cost_usd_m,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve asset: {str(e)}")


@router.get(
    "/{asset_id}/history",
    summary="Get asset production history",
    description="Retrieve historical production data for a specific asset.",
    responses={
        200: {"description": "Production history retrieved successfully"},
        404: {"model": ErrorResponse, "description": "Asset not found"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
)
def get_asset_history(
    asset_id: str,
    months: int = Query(36, ge=1, le=120, description="Number of months of history to retrieve"),
    db: Session = Depends(get_db),
) -> list[dict]:
    """Get historical production data for a specific asset."""
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
        
        production_data = AssetService.get_production_data(db, asset_id, limit=months)
        
        return [
            {
                "period": p.period.isoformat(),
                "oil_bbl_d": p.oil_bbl_d,
                "expected_bbl_d": p.expected_bbl_d,
                "gas_mmcf_d": p.gas_mmcf_d,
                "water_cut_pct": p.water_cut_pct,
                "source": p.source,
            }
            for p in production_data
        ]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve asset history: {str(e)}")
