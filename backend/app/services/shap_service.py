"""SHAP service — canonical attribution delegate.

DEPRECATED: The platform SHAP path is ``app.intelligence.attribution``
(``explain_instance`` / ``attribute_deviation``) backed by ``shap.TreeExplainer``
with deterministic mean-ablation fallback. This module is retained only as a
thin façade so legacy imports continue to resolve without reintroducing random
synthetic SHAP values.
"""

from __future__ import annotations

from sqlalchemy.orm import Session


class SHAPService:
    """Thin façade over the canonical attribution pipeline."""

    @staticmethod
    def generate_explanation(db: Session, asset_id: str, forecast_run_id: int = 0) -> dict:  # type: ignore[override]
        """Delegate to the canonical SHAP attribution — never random.

        Loads the asset via the intelligence pipeline and returns TreeExplainer
        contributions with ``Model-Estimated Feature Contributions`` terminology.
        """
        from sqlalchemy import select

        from app.core.database import SessionLocal
        from app.intelligence.pipeline import analyze_asset
        from app.models import Asset

        session: Session = db  # type: ignore[assignment]
        # Accept either a passed session or fall back to a local one
        close_after = False
        try:
            asset = session.execute(
                select(Asset).where(Asset.asset_id == asset_id)
            ).scalars().first()
        except Exception:
            asset = None
        if asset is None:
            # Try a fresh session if caller passed a closed/mock session
            session = SessionLocal()
            close_after = True
            asset = session.execute(
                select(Asset).where(Asset.asset_id == asset_id)
            ).scalars().first()
            if asset is None:
                if close_after:
                    session.close()
                raise ValueError(f"unknown asset {asset_id}")

        try:
            analysis = analyze_asset(session, asset, persist=False)
            attribution = analysis.get("attribution", {})
            # Normalize to legacy shape for backward compat while exposing canonical keys
            contributions = attribution.get("contributions", [])
            return {
                "asset_id": asset_id,
                "terminology": attribution.get("terminology", "Model-Estimated Feature Contributions"),
                "caveat": attribution.get("caveat", "SHAP indicates patterns learned by the model and does not establish physical causality."),
                "shap_values": [
                    {"feature": c.get("feature"), "value": c.get("shap_value"), "importance": c.get("relative_contribution_pct")}
                    for c in contributions
                ],
                "feature_names": [c.get("feature") for c in contributions],
                "contributions": contributions,
                "base_value": attribution.get("base_value"),
                "explainer_method": attribution.get("explainer_method"),
                "disclaimer": attribution.get("disclaimer"),
            }
        finally:
            if close_after:
                session.close()
