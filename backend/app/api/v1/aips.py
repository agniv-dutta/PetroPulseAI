"""AIPS (Asset Intelligence Priority System) API endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Asset, ScoreRun, AIPSScoreResponse, AssetRankingResponse, ErrorResponse
from app.services.aips_service import AIPSService

router = APIRouter(prefix="/aips", tags=["aips"])


@router.get(
    "/ranking",
    response_model=list[AssetRankingResponse],
    summary="Get asset ranking by AIPS score",
    description="Retrieve all assets ranked by their AIPS (Asset Intelligence Priority System) scores.",
    responses={
        200: {"description": "Asset ranking retrieved successfully"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
)
def get_aips_ranking(
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of assets to return"),
    db: Session = Depends(get_db),
) -> list[AssetRankingResponse]:
    """Get all assets ranked by AIPS score."""
    try:
        from sqlalchemy import select
        from app.models.enums import AIPSPriority
        
        # Get latest AIPS scores for all assets
        stmt = (
            select(ScoreRun)
            .order_by(ScoreRun.created_at.desc())
            .limit(limit * 2)  # Get more to handle duplicates
        )
        all_scores = list(db.execute(stmt).scalars().all())
        
        # Get latest score per asset
        latest_scores = {}
        for score in all_scores:
            if score.asset_id not in latest_scores:
                latest_scores[score.asset_id] = score
        
        # Sort by AIPS score
        sorted_scores = sorted(latest_scores.values(), key=lambda x: x.aips_score, reverse=True)
        
        # Build ranking response
        ranking = []
        for rank, score in enumerate(sorted_scores[:limit], start=1):
            asset = db.get(Asset, score.asset_id)
            if asset:
                ranking.append(
                    AssetRankingResponse(
                        rank=rank,
                        asset_id=asset.id,
                        asset_name=asset.name,
                        aips_score=score.aips_score,
                        priority=score.priority,
                        field=asset.field,
                        basin=asset.basin,
                    )
                )
        
        return ranking
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=ErrorResponse(
                error="AIPSRankingError",
                message=f"Failed to retrieve AIPS ranking: {str(e)}",
                status_code=500,
            ).model_dump(),
        )


@router.get(
    "/{asset_id}",
    response_model=AIPSScoreResponse,
    summary="Get AIPS score for asset",
    description="Retrieve the latest AIPS score for a specific asset.",
    responses={
        200: {"description": "AIPS score retrieved successfully"},
        404: {"model": ErrorResponse, "description": "Asset not found"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
)
def get_aips_score(
    asset_id: str,
    db: Session = Depends(get_db),
) -> AIPSScoreResponse:
    """Get the latest AIPS score for a specific asset."""
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
        
        # Get latest AIPS score
        from sqlalchemy import select
        stmt = (
            select(ScoreRun)
            .where(ScoreRun.asset_id == asset_id)
            .order_by(ScoreRun.created_at.desc())
            .first()
        )
        
        score = db.execute(stmt).scalar_one_or_none()
        if not score:
            raise HTTPException(
                status_code=404,
                detail=ErrorResponse(
                    error="AIPSNotFound",
                    message=f"No AIPS score found for asset {asset_id}",
                    status_code=404,
                ).model_dump(),
            )
        
        return AIPSScoreResponse(
            asset_id=score.asset_id,
            aips_score=score.aips_score,
            priority=score.priority,
            breakdown=score.breakdown or {},
            created_at=score.created_at,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=ErrorResponse(
                error="AIPSScoreError",
                message=f"Failed to retrieve AIPS score: {str(e)}",
                status_code=500,
            ).model_dump(),
        )
