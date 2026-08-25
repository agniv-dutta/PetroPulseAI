"""SHAP explanation endpoint (spec: /shap/{asset_id}).

Wraps ``intelligence.attribution`` - SHAP TreeExplainer contributions for
the trained forecasting ensemble, always presented as "Model-Estimated
Feature Contributions" (never "verified root cause").
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.intelligence.pipeline import analyze_asset
from app.models import Asset
from app.schemas.envelopes import ShapExplanationEnvelope

router = APIRouter(prefix="/shap", tags=["shap"])


@router.get("/{asset_id}", response_model=ShapExplanationEnvelope)
def asset_shap(asset_id: str, db: Session = Depends(get_db)) -> dict:
    """SHAP feature attributions explaining the latest forecast deviation."""
    asset = db.execute(
        select(Asset).where(Asset.asset_id == asset_id)
    ).scalars().first()
    if not asset:
        raise HTTPException(404, f"unknown asset {asset_id}")

    analysis = analyze_asset(db, asset)
    attribution = analysis["attribution"]
    return {
        "asset_id": asset_id,
        **attribution,
        "explainer": "TreeExplainer (GradientBoosting ensemble)",
        "feature_importance": analysis.get("feature_importance"),
        "data_source": "DERIVED",
    }
