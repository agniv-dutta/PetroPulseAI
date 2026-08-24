"""Unit + integration tests for the unified data ingestion pipeline.

Covers: app/data/data_loader.py (CSV/JSON/DataFrame, column mapping,
provenance policy), app/data/preprocessor.py (cleaning steps, features,
chronological splitting, quality reports), app/services/data_service.py
(persistence orchestration) and GET /api/v1/data/quality.
"""

import json

import pandas as pd
import pytest
from sqlalchemy import select

from app.core.database import SessionLocal
from app.data.data_loader import IngestionError, load_any
from app.data.preprocessor import DataPreprocessor, PreprocessConfig
from app.models import Asset, ProductionHistory
from app.services.data_service import DataService


# ---------------------------------------------------------------- helpers
def _daily_rows(asset_id: str = "T-1", days: int = 30, base: float = 100.0) -> list[dict]:
    start = pd.Timestamp("2026-01-01", tz="UTC")
    return [
        {
            "asset_id": asset_id,
            "timestamp": start + pd.Timedelta(days=i),
            "production": max(base - i * 0.5, 1.0),
            "source": "unit-test",
            "source_type": "SYNTHETIC",
        }
        for i in range(days)
    ]


@pytest.fixture()
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


# ---------------------------------------------------------------- loader
class TestDataLoader:
    def test_minimal_real_dataframe_keeps_optional_fields_null(self):
        df = pd.DataFrame([
            {"asset_id": "X-1", "timestamp": "2026-01-01", "production": 120.5},
            {"asset_id": "X-1", "timestamp": "2026-02-01", "production": 118.0},
        ])
        loaded = load_any(df, default_source_type="REAL")

        assert loaded.row_count == 2
        assert (loaded.frame["pressure"].isna()).all(), "REAL rule: absent fields stay NULL"
        assert (loaded.frame["temperature"].isna()).all()
        assert (loaded.frame["flow_rate"].isna()).all()
        assert set(loaded.frame["source_type"]) == {"REAL"}
        # timestamps normalised to UTC
        assert str(loaded.frame["timestamp"].dt.tz).startswith("UTC")

    def test_explicit_column_map_for_foreign_publication(self, tmp_path):
        csv_path = tmp_path / "public_drop.csv"
        pd.DataFrame([
            {"Well Identifier": "PUB-01", "Report Date": "2026-03-01", "Crude Rate": 640.0},
            {"Well Identifier": "PUB-01", "Report Date": "2026-04-01", "Crude Rate": 610.5},
        ]).to_csv(csv_path, index=False)

        loaded = load_any(
            csv_path,
            column_map={
                "asset_id": "Well Identifier",
                "timestamp": "Report Date",
                "production": "Crude Rate",
            },
            default_source_type="REAL",
            dataset_name="public-drop",
        )
        assert loaded.row_count == 2
        assert set(loaded.frame["asset_id"]) == {"PUB-01"}
        assert loaded.frame.iloc[0]["production"] == 640.0
        assert loaded.column_map["production"] == "Crude Rate"

    def test_generic_alias_mapping_without_explicit_map(self):
        df = pd.DataFrame([{
            "Well Code": "W-9",
            "Reporting Date": "2026-05-01",
            "Oil Rate (bbl/d)": 500.0,
        }])
        loaded = load_any(df, default_source_type="SYNTHETIC")
        row = loaded.frame.iloc[0]
        assert row["asset_id"] == "W-9"
        assert row["production"] == 500.0

    def test_json_records_and_json_file(self, tmp_path):
        records = [
            {"asset_id": "J-1", "date": "2026-01-05", "oil_bbl_d": 77.0},
            {"asset_id": "J-1", "date": "2026-02-05", "oil_bbl_d": 74.0},
        ]
        from_records = load_any(records, default_source_type="DERIVED")
        assert from_records.row_count == 2
        assert set(from_records.frame["source_type"]) == {"DERIVED"}

        json_path = tmp_path / "payload.json"
        json_path.write_text(json.dumps({"records": records}))
        from_file = load_any(json_path, default_source_type="DERIVED")
        assert from_file.row_count == 2

    def test_missing_provenance_rejected(self):
        df = pd.DataFrame([{"asset_id": "A", "timestamp": "2026-01-01", "production": 1.0}])
        with pytest.raises(IngestionError):
            load_any(df)

    def test_invalid_source_type_rejected(self):
        df = pd.DataFrame([{"asset_id": "A", "timestamp": "2026-01-01", "production": 1.0}])
        with pytest.raises(IngestionError):
            load_any(df, default_source_type="MAYBE")

    def test_mixed_provenance_rejected(self):
        df = pd.DataFrame([
            {"asset_id": "A", "timestamp": "2026-01-01", "production": 1.0, "source_type": "REAL"},
            {"asset_id": "A", "timestamp": "2026-02-01", "production": 1.0, "source_type": "SYNTHETIC"},
        ])
        with pytest.raises(IngestionError):
            load_any(df)


# ----------------------------------------------------------- preprocessor
class TestPreprocessor:
    def _run(self, rows, **cfg):
        return DataPreprocessor(PreprocessConfig(**cfg)).run(pd.DataFrame(rows))

    def test_duplicates_removed_last_wins(self):
        rows = _daily_rows(days=10)
        dup = dict(rows[3])
        dup["production"] = 555.0
        rows.append(dup)
        result = self._run(rows, remove_outliers=False)  # isolate dedupe semantics

        assert result.report["duplicates_removed"] == 1
        kept = result.frame[result.frame["timestamp"] == rows[3]["timestamp"]]
        assert len(kept) == 1 and kept.iloc[0]["production"] == 555.0

    def test_chronological_sort_repairs_shuffled_input(self):
        rows = _daily_rows(days=12)[::-1]
        result = self._run(rows)
        ts = result.frame["timestamp"].tolist()
        assert ts == sorted(ts)

    def test_negative_production_dropped(self):
        rows = _daily_rows(days=10)
        rows.append({**rows[0], "timestamp": rows[-1]["timestamp"] + pd.Timedelta(days=1),
                     "production": -3.0})
        result = self._run(rows)
        assert result.report["negative_or_null_production_dropped"] == 1
        assert (result.frame["production"] >= 0).all()

    def test_unit_validation_rejects_implausible_pressure(self):
        rows = [dict(r, pressure=150.0 if i % 3 else 99999.0) for i, r in enumerate(_daily_rows(days=9))]
        result = self._run(rows)
        assert result.report["unit_validation_failures"] == 3
        assert result.frame["pressure"].gt(1500).sum() == 0

    def test_unit_conversion_applied_before_validation(self):
        rows = [dict(r, pressure=15.0) for r in _daily_rows(days=4)]  # psi values
        pre = DataPreprocessor(PreprocessConfig(
            unit_conversions={"pressure": ("psi", 0.0689476)}
        ))
        result = pre.run(pd.DataFrame(rows))
        assert abs(result.frame["pressure"].iloc[0] - 15.0 * 0.0689476) < 1e-6

    def test_outlier_detection_removes_extreme_spike(self):
        rows = _daily_rows(asset_id="S-1", days=60)
        spike_value = rows[55]["production"] + 300.0
        rows[55] = dict(rows[55], production=spike_value)
        result = self._run(rows)
        assert result.report["outliers_flagged"] >= 1
        assert result.report["outliers_removed"] == result.report["outliers_flagged"]
        assert result.frame["production"].max() < spike_value

    def test_monthly_aggregation_groups_daily_data(self):
        rows = _daily_rows(days=90)  # Jan/Feb/Mar 2026
        monthly = DataPreprocessor.aggregate_monthly(DataPreprocessor().sort_chronologically(
            DataPreprocessor().normalize_timestamps(pd.DataFrame(rows))
        ))
        assert len(monthly) == 3
        assert monthly["sample_count"].tolist() == [31, 28, 31]
        assert all(str(ts.tz) != "" for ts in monthly["timestamp"])

    def test_feature_generation_values(self):
        start = pd.Timestamp("2025-01-01", tz="UTC")
        rows = [
            {
                "asset_id": "F-1",
                "timestamp": start + pd.DateOffset(months=i),
                "production": 100.0 - 2.0 * i,
                "source": "t",
                "source_type": "DERIVED",
            }
            for i in range(13)
        ]
        pre = DataPreprocessor(PreprocessConfig())
        frame = pre.add_features(pre.sort_chronologically(
            pre.normalize_timestamps(pd.DataFrame(rows))
        ))

        prod = frame["production"]
        assert frame["production_lag_1"].iloc[1] == prod.iloc[0]
        assert pd.isna(frame["production_lag_1"].iloc[0])
        assert frame["production_lag_3"].iloc[5] == prod.iloc[2]
        assert pd.isna(frame["production_lag_6"].iloc[5])
        assert frame["production_lag_6"].iloc[7] == prod.iloc[1]
        assert frame["rolling_mean"].iloc[0] == prod.iloc[0]
        assert frame["rolling_mean"].iloc[2] == pytest.approx(prod.iloc[:3].mean())
        assert frame["decline_rate"].iloc[0] == 0.0
        assert frame["decline_rate"].iloc[1] == pytest.approx(-frame["production"].pct_change().iloc[1])
        assert frame["seasonal_factor"].nunique() >= 1
        assert frame["production_deviation"].iloc[0] == 0.0
        # strictly decreasing series => positive decline rate after first step
        assert (frame["decline_rate"].iloc[1:] > 0).all()

    def test_chronological_split_no_shuffle_no_overlap(self):
        rows = _daily_rows("M-1", days=40) + _daily_rows("M-2", days=20)
        df = DataPreprocessor().sort_chronologically(
            DataPreprocessor().normalize_timestamps(pd.DataFrame(rows))
        )
        train, test = DataPreprocessor.chronological_split(df, train_fraction=0.8)

        assert len(train) + len(test) == len(df)
        for asset, n in (("M-1", 40), ("M-2", 20)):
            tr = train[train["asset_id"] == asset].reset_index(drop=True)
            te = test[test["asset_id"] == asset].reset_index(drop=True)
            assert len(tr) == round(n * 0.8)
            assert len(te) == n - len(tr)
            assert tr["timestamp"].is_monotonic_increasing
            assert te["timestamp"].is_monotonic_increasing
            assert tr["timestamp"].max() <= te["timestamp"].min()
        # no random shuffling: original ordering preserved within each split
        assert train[train["asset_id"] == "M-1"]["production"].iloc[0] > \
               train[train["asset_id"] == "M-1"]["production"].iloc[-1]

    def test_quality_report_fields(self):
        rows = _daily_rows("Q-1", days=8)
        rows.append(rows[0].copy())  # exact duplicate (asset, timestamp)
        rows.append({
            **rows[1],
            "timestamp": rows[1]["timestamp"] + pd.Timedelta(days=100),
            "pressure": None,
        })
        df = DataPreprocessor().normalize_timestamps(pd.DataFrame(rows))
        report = DataPreprocessor.quality_report(df)

        for key in ("number_of_rows", "assets", "date_range", "missingness",
                    "duplicate_count", "source_distribution", "source_type_distribution"):
            assert key in report
        assert report["number_of_rows"] == len(rows)
        assert report["duplicate_count"] == 1
        assert report["assets"] == 1
        assert report["missingness"]["pressure"] == len(rows)
        assert report["source_type_distribution"] == {"SYNTHETIC": len(rows)}
        assert report["date_range"]["start"].startswith("2026-01-01")


# ------------------------------------------------------------ data service
class TestDataService:
    def test_ingest_csv_real_persists_with_null_operational_fields(self, db, tmp_path):
        csv_path = tmp_path / "real.csv"
        pd.DataFrame([
            {"asset_id": "SVY-1", "timestamp": "2026-01-01", "production": 800.0},
            {"asset_id": "SVY-1", "timestamp": "2026-02-01", "production": 780.0},
            {"asset_id": "SVY-1", "timestamp": "2026-03-01", "production": 755.0},
        ]).to_csv(csv_path, index=False)

        report = DataService(db).ingest_csv(csv_path, source_type="REAL")
        assert report.rows_persisted == 3
        assert report.assets_created == ["SVY-1"]

        stored = db.execute(
            select(ProductionHistory).where(ProductionHistory.asset_id == "SVY-1")
        ).scalars().all()
        assert len(stored) == 3
        assert all(p.pressure is None and p.temperature is None and p.flow_rate is None
                   for p in stored), "ingestion must never fabricate operational values"
        assert {p.source_type for p in stored} == {"REAL"}

        stub = db.execute(select(Asset).where(Asset.asset_id == "SVY-1")).scalar_one()
        assert stub.status == "REGISTERED"

    def test_ingest_is_idempotent_on_repeat_runs(self, db, tmp_path):
        csv_path = tmp_path / "same.csv"
        pd.DataFrame([
            {"asset_id": "IDEM-1", "timestamp": "2026-01-01", "production": 10.0},
            {"asset_id": "IDEM-1", "timestamp": "2026-02-01", "production": 9.0},
        ]).to_csv(csv_path, index=False)
        service = DataService(db)

        first = service.ingest_csv(csv_path, source_type="REAL")
        second = service.ingest_csv(csv_path, source_type="REAL")

        assert first.rows_persisted == 2
        assert second.rows_persisted == 0
        assert second.rows_skipped_db_duplicates == 2

    def test_synthetic_simulation_ingestion_forced_provenance(self, db):
        observations = [
            {"asset_id": "SIMV-1", "timestamp": "2026-01-01T00:00:00Z", "production": 900.0},
            {"asset_id": "SIMV-1", "timestamp": "2026-01-01T00:00:10Z", "production": 895.0},
        ]
        report = DataService(db).ingest_synthetic_simulation(observations)
        assert report.source_type == "SYNTHETIC"
        assert report.rows_persisted == 2

    def test_db_quality_report_counts(self, db, tmp_path):
        csv_path = tmp_path / "q.csv"
        pd.DataFrame([
            {"asset_id": "QR-1", "timestamp": "2026-01-01", "production": 5.0},
            {"asset_id": "QR-1", "timestamp": "2026-02-01", "production": 6.0},
        ]).to_csv(csv_path, index=False)
        DataService(db).ingest_csv(csv_path, source_type="REAL")

        quality = DataService.db_quality_report(db)
        for key in ("number_of_rows", "assets", "date_range", "missingness",
                    "duplicate_count", "source_distribution", "source_type_distribution"):
            assert key in quality
        assert quality["number_of_rows"] >= 2
        assert quality["assets"] >= 1
        assert quality["duplicate_count"] == 0
        assert quality["source_type_distribution"].get("REAL", 0) >= 2
        assert "SYNTHETIC" in quality["source_type_distribution"]


# --------------------------------------------------------------- API layer
class TestDataQualityEndpoint:
    def test_quality_endpoint_contract(self, client):
        res = client.get("/api/v1/data/quality")
        assert res.status_code == 200
        body = res.json()

        for key in ("number_of_rows", "assets", "date_range", "missingness",
                    "duplicate_count", "source_distribution",
                    "source_type_distribution", "policy"):
            assert key in body
        assert body["number_of_rows"] >= 1
        assert body["assets"] >= 1
        assert body["date_range"]["start"] is not None
        assert set(body["source_type_distribution"]) <= {"REAL", "SYNTHETIC", "DERIVED"}
        assert body["source_type_distribution"].get("SYNTHETIC", 0) >= 1
        assert "never" in body["policy"]

    def test_quality_reflects_new_ingestion(self, client):
        before = client.get("/api/v1/data/quality").json()["number_of_rows"]
        with SessionLocal() as db:
            DataService(db).ingest_json_records(
                [
                    {"asset_id": "API-Q-1", "timestamp": "2026-04-01", "production": 42.0},
                    {"asset_id": "API-Q-1", "timestamp": "2026-05-01", "production": 41.0},
                ],
                source_type="REAL",
                dataset_name="api-quality-test",
            )
        after = client.get("/api/v1/data/quality").json()
        assert after["number_of_rows"] == before + 2
