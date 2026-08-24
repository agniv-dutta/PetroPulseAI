"""SHAP service for business logic."""

import random

from sqlalchemy.orm import Session

from app.models import SHAPExplanationRequest


class SHAPService:
    """Service for SHAP explanation business logic."""

    @staticmethod
    def generate_explanation(db: Session, asset_id: str, forecast_run_id: int) -> dict:
        """Generate SHAP explanation for a forecast."""
        # Generate synthetic SHAP values for demonstration
        feature_names = ["production_rate", "pressure", "temperature", "flow_rate", "water_cut"]
        shap_values = [
            {
                "feature": feature,
                "value": round(random.uniform(-0.5, 0.5), 4),
                "importance": round(random.uniform(0.1, 0.9), 4),
            }
            for feature in feature_names
        ]
        
        return {
            "shap_values": shap_values,
            "feature_names": feature_names,
            "base_value": round(random.uniform(1000, 3000), 2),
        }
