"""Data loader for loading production data from various sources."""

import pandas as pd
from datetime import date, datetime, timedelta, timezone
from typing import Optional
from sqlalchemy.orm import Session

from app.models import Asset, MonthlyProduction
from app.utils.logger import logger


class DataLoader:
    """Loader for production data from database and external sources."""

    @staticmethod
    def load_asset_production(
        db: Session,
        asset_id: str,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        limit: Optional[int] = None,
    ) -> pd.DataFrame:
        """Load production data for an asset into a DataFrame."""
        from sqlalchemy import select
        
        stmt = select(MonthlyProduction).where(MonthlyProduction.asset_id == asset_id)
        
        if start_date:
            stmt = stmt.where(MonthlyProduction.period >= start_date)
        if end_date:
            stmt = stmt.where(MonthlyProduction.period <= end_date)
        
        stmt = stmt.order_by(MonthlyProduction.period)
        
        if limit:
            stmt = stmt.limit(limit)
        
        production_data = list(db.execute(stmt).scalars().all())
        
        if not production_data:
            logger.warning(f"No production data found for asset {asset_id}")
            return pd.DataFrame()
        
        data = [
            {
                "period": p.period,
                "oil_bbl_d": p.oil_bbl_d,
                "expected_bbl_d": p.expected_bbl_d,
                "gas_mmcf_d": p.gas_mmcf_d,
                "water_cut_pct": p.water_cut_pct,
                "source": p.source,
            }
            for p in production_data
        ]
        
        df = pd.DataFrame(data)
        df["period"] = pd.to_datetime(df["period"])
        df = df.sort_values("period")
        
        logger.info(f"Loaded {len(df)} production records for asset {asset_id}")
        return df

    @staticmethod
    def load_portfolio_production(
        db: Session,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> pd.DataFrame:
        """Load production data for all assets into a DataFrame."""
        from sqlalchemy import select
        
        stmt = select(MonthlyProduction, Asset).join(Asset)
        
        if start_date:
            stmt = stmt.where(MonthlyProduction.period >= start_date)
        if end_date:
            stmt = stmt.where(MonthlyProduction.period <= end_date)
        
        stmt = stmt.order_by(MonthlyProduction.period)
        
        results = db.execute(stmt).all()
        
        if not results:
            logger.warning("No production data found for portfolio")
            return pd.DataFrame()
        
        data = []
        for production, asset in results:
            data.append({
                "asset_id": asset.id,
                "asset_name": asset.name,
                "field": asset.field,
                "basin": asset.basin,
                "period": production.period,
                "oil_bbl_d": production.oil_bbl_d,
                "expected_bbl_d": production.expected_bbl_d,
                "gas_mmcf_d": production.gas_mmcf_d,
                "water_cut_pct": production.water_cut_pct,
                "source": production.source,
            })
        
        df = pd.DataFrame(data)
        df["period"] = pd.to_datetime(df["period"])
        df = df.sort_values(["asset_id", "period"])
        
        logger.info(f"Loaded {len(df)} production records for portfolio")
        return df

    @staticmethod
    def load_asset_metadata(db: Session, asset_id: str) -> Optional[dict]:
        """Load asset metadata."""
        asset = db.get(Asset, asset_id)
        if not asset:
            logger.warning(f"Asset {asset_id} not found")
            return None
        
        return {
            "id": asset.id,
            "name": asset.name,
            "field": asset.field,
            "basin": asset.basin,
            "latitude": asset.latitude,
            "longitude": asset.longitude,
            "onstream_year": asset.onstream_year,
            "status": asset.status,
            "baseline_qi": asset.baseline_qi,
            "baseline_di": asset.baseline_di,
            "baseline_b": asset.baseline_b,
            "operating_cost_usd_m": asset.operating_cost_usd_m,
            "intervention_cost_usd_m": asset.intervention_cost_usd_m,
        }

    @staticmethod
    def load_all_assets(db: Session, status: Optional[str] = None) -> pd.DataFrame:
        """Load all assets into a DataFrame."""
        from sqlalchemy import select
        
        stmt = select(Asset)
        if status:
            stmt = stmt.where(Asset.status == status)
        
        assets = list(db.execute(stmt).scalars().all())
        
        if not assets:
            logger.warning("No assets found")
            return pd.DataFrame()
        
        data = [
            {
                "id": a.id,
                "name": a.name,
                "field": a.field,
                "basin": a.basin,
                "latitude": a.latitude,
                "longitude": a.longitude,
                "onstream_year": a.onstream_year,
                "status": a.status,
                "baseline_qi": a.baseline_qi,
                "baseline_di": a.baseline_di,
                "baseline_b": a.baseline_b,
            }
            for a in assets
        ]
        
        df = pd.DataFrame(data)
        logger.info(f"Loaded {len(df)} assets")
        return df

    @staticmethod
    def load_recent_production(
        db: Session,
        asset_id: str,
        months: int = 12,
    ) -> pd.DataFrame:
        """Load recent production data for an asset."""
        end_date = datetime.now(timezone.utc).date()
        start_date = end_date - timedelta(days=months * 30)
        
        return DataLoader.load_asset_production(db, asset_id, start_date, end_date)
