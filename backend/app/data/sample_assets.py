"""Sample asset generator for seeding the database."""

from datetime import date, datetime, timedelta, timezone
import random
from sqlalchemy import select, func, text
from sqlalchemy.orm import Session

from app.models import Asset, MonthlyProduction


class SampleAssetGenerator:
    """Generator for sample asset and production data."""

    @staticmethod
    def seed_database(db: Session) -> dict:
        """Seed the database with sample assets and production data."""
        # Check if database already has assets
        existing_assets = db.execute(select(func.count(Asset.id))).scalar()
        if existing_assets and existing_assets > 0:
            return {
                "status": "skipped",
                "assets": existing_assets,
                "message": "Database already contains assets",
            }

        # Generate sample assets
        fields = ["Permian Basin", "Eagle Ford", "Bakken", "Niobrara", "Marcellus"]
        basins = ["West Texas", "South Texas", "North Dakota", "Colorado", "Pennsylvania"]
        
        assets_created = 0
        for i in range(12):
            asset = Asset(
                id=f"ASSET-{i+1:03d}",
                name=f"Sample Well {i+1}",
                field=random.choice(fields),
                basin=random.choice(basins),
                latitude=random.uniform(30.0, 40.0),
                longitude=random.uniform(-100.0, -90.0),
                onstream_year=random.randint(2015, 2022),
                status="ACTIVE",
                baseline_qi=random.uniform(2000, 6000),
                baseline_di=random.uniform(0.01, 0.05),
                baseline_b=random.uniform(0.5, 2.0),
                operating_cost_usd_m=random.uniform(0.5, 2.0),
                intervention_cost_usd_m=random.uniform(1.0, 3.0),
            )
            db.add(asset)
            assets_created += 1

        db.commit()

        # Generate production data for each asset
        production_created = 0
        asset_ids = db.execute(select(Asset.id)).scalars().all()
        for asset_id in asset_ids:
            base_production = random.uniform(2000, 5000)
            for month in range(36):
                period = date.today() - timedelta(days=30 * (35 - month))
                decline_factor = 0.95 ** month
                production = base_production * decline_factor + random.uniform(-200, 200)
                expected = base_production * decline_factor
                
                prod = MonthlyProduction(
                    asset_id=asset_id,
                    period=period,
                    oil_bbl_d=max(0, production),
                    expected_bbl_d=max(0, expected),
                    gas_mmcf_d=random.uniform(0, 5),
                    water_cut_pct=random.uniform(0, 30),
                    source="SYNTHETIC",
                )
                db.add(prod)
                production_created += 1

        db.commit()
        
        return {
            "status": "success",
            "assets": assets_created,
            "production_records": production_created,
            "message": f"Created {assets_created} assets and {production_created} production records",
        }
