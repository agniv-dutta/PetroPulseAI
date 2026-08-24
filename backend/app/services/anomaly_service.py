"""Anomaly service for business logic."""

from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import select
import random

from app.models import AnomalyEvent, AnomalyRequest


class AnomalyService:
    """Service for anomaly detection business logic."""

    @staticmethod
    def detect_anomalies(db: Session, request: AnomalyRequest) -> list[AnomalyEvent]:
        """Detect anomalies for an asset in the specified time window."""
        # Create synthetic anomaly events for demonstration
        anomalies = []
        for i in range(random.randint(0, 3)):
            anomaly = AnomalyEvent(
                id=f"ANOM-{random.randint(1000, 9999)}",
                asset_id=request.asset_id,
                detected_at=datetime.now(timezone.utc),
                window_start=request.window_start,
                window_end=request.window_end,
                severity=random.choice(["CRITICAL", "ALERT", "WATCH", "NORMAL"]),
                anomaly_score=random.uniform(0.5, 1.0),
                deviation_pct=random.uniform(10, 50),
                expected_bbl_d=random.uniform(1000, 5000),
                actual_bbl_d=random.uniform(500, 4500),
                contributing_features=[
                    {"feature": "production_rate", "importance": random.uniform(0.3, 0.8)},
                    {"feature": "pressure", "importance": random.uniform(0.1, 0.5)},
                ],
                status="ACTIVE",
            )
            db.add(anomaly)
            anomalies.append(anomaly)
        
        db.commit()
        return anomalies

    @staticmethod
    def get_anomalies(db: Session, asset_id: str, limit: int = 50) -> list[AnomalyEvent]:
        """Get anomaly events for an asset."""
        stmt = (
            select(AnomalyEvent)
            .where(AnomalyEvent.asset_id == asset_id)
            .order_by(AnomalyEvent.detected_at.desc())
            .limit(limit)
        )
        return list(db.execute(stmt).scalars().all())

    @staticmethod
    def acknowledge_anomaly(db: Session, anomaly_id: str) -> AnomalyEvent | None:
        """Acknowledge an anomaly event."""
        anomaly = db.get(AnomalyEvent, anomaly_id)
        if anomaly:
            anomaly.status = "ACKNOWLEDGED"
            db.commit()
            db.refresh(anomaly)
        return anomaly
