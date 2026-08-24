"""Data service for business logic."""

from datetime import date, datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from app.models import Asset, MonthlyProduction


class DataService:
    """Service for data management business logic."""

    @staticmethod
    def add_production_data(db: Session, asset_id: str, period: date, oil_bbl_d: float, expected_bbl_d: float) -> MonthlyProduction:
        """Add production data for an asset."""
        production = MonthlyProduction(
            asset_id=asset_id,
            period=period,
            oil_bbl_d=oil_bbl_d,
            expected_bbl_d=expected_bbl_d,
            source="MANUAL",
            created_at=datetime.now(timezone.utc),
        )
        db.add(production)
        db.commit()
        db.refresh(production)
        return production

    @staticmethod
    def bulk_add_production_data(db: Session, production_data: list[dict]) -> list[MonthlyProduction]:
        """Bulk add production data."""
        productions = []
        for data in production_data:
            production = MonthlyProduction(
                asset_id=data["asset_id"],
                period=data["period"],
                oil_bbl_d=data["oil_bbl_d"],
                expected_bbl_d=data["expected_bbl_d"],
                source=data.get("source", "BULK"),
                created_at=datetime.now(timezone.utc),
            )
            db.add(production)
            productions.append(production)
        
        db.commit()
        for production in productions:
            db.refresh(production)
        return productions

    @staticmethod
    def get_production_by_period(db: Session, asset_id: str, start_date: date, end_date: date) -> list[MonthlyProduction]:
        """Get production data for a specific period."""
        stmt = (
            select(MonthlyProduction)
            .where(MonthlyProduction.asset_id == asset_id)
            .where(MonthlyProduction.period >= start_date)
            .where(MonthlyProduction.period <= end_date)
            .order_by(MonthlyProduction.period)
        )
        return list(db.execute(stmt).scalars().all())

    @staticmethod
    def get_latest_production(db: Session, asset_id: str) -> MonthlyProduction | None:
        """Get the latest production data for an asset."""
        stmt = (
            select(MonthlyProduction)
            .where(MonthlyProduction.asset_id == asset_id)
            .order_by(MonthlyProduction.period.desc())
            .first()
        )
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def delete_production_data(db: Session, asset_id: str, period: date) -> bool:
        """Delete production data for a specific period."""
        stmt = (
            select(MonthlyProduction)
            .where(MonthlyProduction.asset_id == asset_id)
            .where(MonthlyProduction.period == period)
        )
        production = db.execute(stmt).scalar_one_or_none()
        if production:
            db.delete(production)
            db.commit()
            return True
        return False

    @staticmethod
    def get_asset_count(db: Session) -> int:
        """Get total number of assets."""
        return db.execute(select(func.count(Asset.id))).scalar() or 0

    @staticmethod
    def get_production_count(db: Session) -> int:
        """Get total number of production records."""
        return db.execute(select(func.count(MonthlyProduction.id))).scalar() or 0
