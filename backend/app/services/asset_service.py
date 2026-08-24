"""Asset service for business logic."""

from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models import Asset, MonthlyProduction


class AssetService:
    """Service for asset-related business logic."""

    @staticmethod
    def get_assets(db: Session, limit: int = 100, offset: int = 0) -> list[Asset]:
        """Get all assets with pagination."""
        stmt = select(Asset).offset(offset).limit(limit)
        return list(db.execute(stmt).scalars().all())

    @staticmethod
    def get_asset(db: Session, asset_id: str) -> Asset | None:
        """Get a specific asset by ID."""
        return db.get(Asset, asset_id)

    @staticmethod
    def get_production_data(db: Session, asset_id: str, limit: int = 36) -> list[MonthlyProduction]:
        """Get production data for an asset."""
        stmt = (
            select(MonthlyProduction)
            .where(MonthlyProduction.asset_id == asset_id)
            .order_by(MonthlyProduction.period.desc())
            .limit(limit)
        )
        return list(db.execute(stmt).scalars().all())[::-1]
