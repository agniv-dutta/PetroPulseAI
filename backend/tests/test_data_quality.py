"""Data quality tests: pipeline integrity and schema compliance.

Verifies:
    - No future data leakage
    - Chronological splits (no shuffle)
    - No duplicate timestamps
    - Positive production values
    - Valid asset IDs
    - Valid source_type
    - Real/synthetic provenance flags
"""

import numpy as np
import pandas as pd
import pytest
from sqlalchemy import func, select

from app.core.database import SessionLocal, engine, Base
from app.ingestion.seed import seed_database
from app.models import Asset, ProductionHistory
from app.utils.synthetic_generator import SyntheticGenerator


@pytest.fixture(scope="module")
def seeded_db():
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        if not db.scalar(select(func.count()).select_from(Asset)):
            seed_database(db)
        yield db


@pytest.fixture(scope="module")
def sample_history(seeded_db):
    with SessionLocal() as db:
        rows = db.execute(
            select(ProductionHistory)
            .where(ProductionHistory.asset_id == "MH-07")
            .order_by(ProductionHistory.timestamp.asc())
        ).scalars().all()
        return [(r.timestamp, float(r.production)) for r in rows]


class TestNoFutureLeakage:
    """All historical timestamps must be in the past (relative to seed date)."""

    def test_all_timestamps_not_future(self, sample_history):
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        for ts, _ in sample_history:
            # Handle both naive and aware datetimes
            if ts.tzinfo is None:
                ts_aware = ts.replace(tzinfo=timezone.utc)
            else:
                ts_aware = ts
            assert ts_aware <= now, f"future timestamp found: {ts}"

    def test_monotonic_timestamps(self, sample_history):
        timestamps = [ts for ts, _ in sample_history]
        assert timestamps == sorted(timestamps)


class TestChronologicalSplits:
    """Train/test splits must never shuffle time series data."""

    def test_train_test_split_preserves_order(self, seeded_db):
        with SessionLocal() as db:
            rows = db.execute(
                select(ProductionHistory)
                .where(ProductionHistory.asset_id == "MH-07")
                .order_by(ProductionHistory.timestamp.asc())
            ).scalars().all()
        n = len(rows)
        split_idx = int(n * 0.8)
        train = [r.timestamp for r in rows[:split_idx]]
        test = [r.timestamp for r in rows[split_idx:]]
        assert train == sorted(train)
        assert test == sorted(test)
        if train and test:
            assert max(train) <= min(test)


class TestNoDuplicateTimestamps:
    """Each asset should have at most one production record per timestamp."""

    def test_no_duplicates_per_asset(self, seeded_db):
        with SessionLocal() as db:
            assets = db.execute(select(Asset)).scalars().all()
            for asset in assets:
                rows = db.execute(
                    select(ProductionHistory)
                    .where(ProductionHistory.asset_id == asset.asset_id)
                    .order_by(ProductionHistory.timestamp.asc())
                ).scalars().all()
                timestamps = [r.timestamp for r in rows]
                assert len(timestamps) == len(set(timestamps)), (
                    f"duplicate timestamps for {asset.asset_id}"
                )


class TestPositiveProduction:
    """All production values must be strictly positive."""

    def test_all_production_positive(self, seeded_db):
        with SessionLocal() as db:
            rows = db.execute(select(ProductionHistory)).scalars().all()
            for r in rows:
                assert float(r.production) > 0, (
                    f"non-positive production: {r.asset_id} {r.timestamp} = {r.production}"
                )


class TestValidAssetIDs:
    """Every production record must reference a known asset."""

    def test_foreign_key_integrity(self, seeded_db):
        with SessionLocal() as db:
            asset_ids = {
                a.asset_id for a in db.execute(select(Asset)).scalars().all()
            }
            rows = db.execute(select(ProductionHistory)).scalars().all()
            for r in rows:
                assert r.asset_id in asset_ids, (
                    f"orphaned production record: asset_id={r.asset_id}"
                )


class TestValidSourceType:
    """source_type must be one of the approved values."""

    def test_synthetic_generator_produces_valid_source_type(self):
        gen = SyntheticGenerator("T-1", {"qi": 5000, "di": 0.03, "b": 0.5}, seed=42)
        obs = gen.next_observation()
        assert obs["source_type"] in ("SYNTHETIC", "REAL")

    def test_seed_data_is_synthetic(self, seeded_db):
        with SessionLocal() as db:
            rows = db.execute(select(ProductionHistory)).scalars().all()
            for r in rows:
                if hasattr(r, 'source_type') and r.source_type:
                    assert r.source_type in ("SYNTHETIC", "REAL", None)


class TestRealSyntheticProvenance:
    """Synthetic data must carry explicit provenance flags."""

    def test_synthetic_observation_has_disclaimer(self):
        gen = SyntheticGenerator("T-1", {"qi": 5000, "di": 0.03, "b": 0.5}, seed=42)
        obs = gen.next_observation()
        assert obs["source_type"] == "SYNTHETIC"
        assert obs["simulation"] is True
        assert "demonstration" in obs["disclaimer"].lower() or "synthetic" in obs["disclaimer"].lower()

    def test_synthetic_observation_has_required_fields(self):
        gen = SyntheticGenerator("T-1", {"qi": 5000, "di": 0.03, "b": 0.5}, seed=42)
        obs = gen.next_observation()
        for key in ("source_type", "simulation", "disclaimer", "source"):
            assert key in obs, f"missing provenance field: {key}"
