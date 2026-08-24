"""AIPS service for business logic."""

from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import select
import random

from app.models import ScoreRun, AIPSScoreRequest


class AIPSService:
    """Service for AIPS scoring business logic."""

    @staticmethod
    def calculate_aips_score(db: Session, request: AIPSScoreRequest) -> ScoreRun:
        """Calculate AIPS score for an asset."""
        score_run = ScoreRun(
            asset_id=request.asset_id,
            aips_score=random.uniform(0, 1),
            priority=random.choice(["CRITICAL", "HIGH", "MEDIUM", "LOW"]),
            breakdown={
                "anomaly_score": random.uniform(0, 1),
                "decline_rate": random.uniform(0, 0.1),
                "production_variance": random.uniform(0, 1),
                "recovery_potential": random.uniform(0, 100),
            },
            created_at=datetime.now(timezone.utc),
        )
        db.add(score_run)
        db.commit()
        db.refresh(score_run)
        return score_run

    @staticmethod
    def get_score_history(db: Session, asset_id: str, limit: int = 10) -> list[ScoreRun]:
        """Get AIPS score history for an asset."""
        stmt = (
            select(ScoreRun)
            .where(ScoreRun.asset_id == asset_id)
            .order_by(ScoreRun.created_at.desc())
            .limit(limit)
        )
        return list(db.execute(stmt).scalars().all())
