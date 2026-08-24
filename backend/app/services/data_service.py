"""Data service: orchestrates load -> preprocess -> persist -> quality.

This is the single entry point the rest of the platform should use to bring
external data into `production_history`:

    DataService(db).ingest_csv(path, source_type="REAL", column_map={...})

Provenance contract enforced end-to-end:
- REAL rows are stored exactly as received; absent operational fields stay
  NULL (never interpolated, never fabricated).
- SYNTHETIC rows come only from the simulation/generator pipeline.
- DERIVED rows are model outputs.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Mapping, Sequence

import pandas as pd
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.data.data_loader import LoadedDataset, IngestionError, load_any
from app.data.preprocessor import DataPreprocessor, PreprocessConfig
from app.models import Asset, DataSource, ProductionHistory
from app.utils.logger import logger

UNKNOWN_ASSET_PLACEHOLDER = {
    "field_name": "UNSPECIFIED",
    "basin": "UNSPECIFIED",
    "status": "REGISTERED",
    "latitude": 0.0,
    "longitude": 0.0,
}


@dataclass
class IngestReport:
    dataset_name: str
    source_type: str
    rows_received: int
    rows_persisted: int = 0
    rows_skipped_db_duplicates: int = 0
    assets_created: list[str] = field(default_factory=list)
    quality: dict[str, Any] = field(default_factory=dict)
    issues: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "dataset_name": self.dataset_name,
            "source_type": self.source_type,
            "rows_received": self.rows_received,
            "rows_persisted": self.rows_persisted,
            "rows_skipped_db_duplicates": self.rows_skipped_db_duplicates,
            "assets_created": self.assets_created,
            "quality": self.quality,
            "issues": self.issues,
        }


class DataService:
    """Facade over the unified loader + preprocessor + persistence."""

    def __init__(self, db: Session, config: PreprocessConfig | None = None):
        self.db = db
        self.preprocessor = DataPreprocessor(config or PreprocessConfig())

    # ------------------------------------------------------------- ingest
    def ingest(
        self,
        loaded: LoadedDataset,
        *,
        dataset_name: str | None = None,
        register_source: bool = True,
        upsert_assets: bool = True,
        compute_features: bool = False,
    ) -> IngestReport:
        result = self.preprocessor.run(loaded.frame, compute_features=compute_features)
        frame = result.frame
        report = IngestReport(
            dataset_name=dataset_name or loaded.dataset_name,
            source_type=str(frame["source_type"].iloc[0]) if not frame.empty else loaded.source_type,
            rows_received=int(len(loaded.frame)),
            quality=result.report,
            issues=list(result.issues),
        )

        if frame.empty:
            report.issues.append("no rows survived preprocessing; nothing persisted")
            return report

        known_codes = set(
            self.db.execute(select(Asset.asset_id)).scalars().all()
        )
        frame_codes = set(frame["asset_id"].unique())
        unknown = sorted(frame_codes - known_codes)
        if unknown and not upsert_assets:
            before = len(frame)
            frame = frame[frame["asset_id"].isin(known_codes)]
            skipped_unknown = before - len(frame)
            report.issues.append(
                f"{skipped_unknown} row(s) skipped for unregistered assets {unknown}"
            )
        elif unknown:
            for code in unknown:
                self.db.add(Asset(asset_id=code, **dict(UNKNOWN_ASSET_PLACEHOLDER)))
            report.assets_created = unknown

        if report.assets_created:
            self.db.flush()

        # Idempotency guard: skip rows already stored for those (asset, ts).
        def _as_utc(dt: datetime) -> datetime:
            return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt

        existing_pairs: set[tuple[str, datetime]] = set()
        frame_codes = list(set(frame["asset_id"].unique()))
        if frame_codes:
            rows = self.db.execute(
                select(ProductionHistory.asset_id, ProductionHistory.timestamp)
                .where(ProductionHistory.asset_id.in_(frame_codes))
            ).all()
            existing_pairs = {(a, _as_utc(t)) for a, t in rows}

        inserted = 0
        for row in frame.itertuples(index=False):
            ts = row.timestamp.to_pydatetime() if hasattr(row.timestamp, "to_pydatetime") else row.timestamp
            if not ts.tzinfo:
                ts = ts.replace(tzinfo=timezone.utc)
            if (row.asset_id, ts) in existing_pairs:
                report.rows_skipped_db_duplicates += 1
                continue
            self.db.add(ProductionHistory(
                asset_id=row.asset_id,
                timestamp=ts,
                production=float(row.production),
                pressure=None if pd.isna(row.pressure) else float(row.pressure),
                temperature=None if pd.isna(row.temperature) else float(row.temperature),
                flow_rate=None if pd.isna(row.flow_rate) else float(row.flow_rate),
                valve_status=row.valve_status if isinstance(row.valve_status, str) else None,
                source=row.source if isinstance(row.source, str) else None,
                source_type=row.source_type,
            ))
            existing_pairs.add((row.asset_id, ts))
            inserted += 1

        if register_source:
            self._register_source(report.dataset_name, report.source_type)

        try:
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise
        report.rows_persisted = inserted
        logger.info(
            "ingest '%s': persisted %d/%d rows (%s), assets created=%s",
            report.dataset_name, inserted, report.rows_received,
            report.source_type, report.assets_created,
        )
        return report

    def _register_source(self, dataset_name: str, source_type: str) -> None:
        existing = self.db.execute(
            select(DataSource).where(
                DataSource.source_name == "EXTERNAL",
                DataSource.dataset_name == dataset_name,
            )
        ).scalars().first()
        if existing:
            existing.last_updated = datetime.now(timezone.utc)
            return
        self.db.add(DataSource(
            source_name="EXTERNAL",
            source_type=source_type,
            dataset_name=dataset_name,
            description=(
                "Ingested through the unified PetroPulse data pipeline. "
                "REAL rows preserved verbatim with NULLs for absent operational fields."
            ),
            coverage="as provided by source file",
            update_frequency="on ingestion",
        ))

    # --------------------------------------------------------- convenience
    def ingest_csv(
        self,
        path: str | Path,
        *,
        source_type: str = "REAL",
        column_map: Mapping[str, str] | None = None,
        dataset_name: str | None = None,
        csv_kwargs: Mapping[str, Any] | None = None,
        upsert_assets: bool = True,
    ) -> IngestReport:
        """Ingest a REAL historical CSV drop (e.g. a published public dataset)."""
        loaded = load_any(
            path,
            column_map=column_map,
            default_source_type=source_type,
            dataset_name=dataset_name,
            csv_kwargs=csv_kwargs,
        )
        return self.ingest(loaded, upsert_assets=upsert_assets)

    def ingest_json_records(
        self,
        records: Sequence[Mapping[str, Any]],
        *,
        source_type: str = "SYNTHETIC",
        column_map: Mapping[str, str] | None = None,
        dataset_name: str | None = None,
        upsert_assets: bool = True,
    ) -> IngestReport:
        loaded = load_any(
            list(records),
            column_map=column_map,
            default_source_type=source_type,
            dataset_name=dataset_name,
        )
        return self.ingest(loaded, upsert_assets=upsert_assets)

    def ingest_dataframe(
        self,
        df: pd.DataFrame,
        *,
        source_type: str,
        column_map: Mapping[str, str] | None = None,
        dataset_name: str | None = None,
        upsert_assets: bool = True,
        compute_features: bool = False,
    ) -> IngestReport:
        loaded = load_any(
            df,
            column_map=column_map,
            default_source_type=source_type,
            dataset_name=dataset_name,
        )
        return self.ingest(loaded, upsert_assets=upsert_assets, compute_features=compute_features)

    def ingest_synthetic_simulation(self, observations: Sequence[Mapping[str, Any]]) -> IngestReport:
        """Persist simulation-engine telemetry; provenance is forced SYNTHETIC."""
        if not observations:
            raise IngestionError("no simulation observations supplied")
        return self.ingest_json_records(
            observations, source_type="SYNTHETIC", dataset_name="simulation-engine"
        )

    # ------------------------------------------------------------ quality
    @staticmethod
    def db_quality_report(db: Session) -> dict[str, Any]:
        """Data-quality statistics computed directly from the database."""
        total_rows = int(db.scalar(select(func.count()).select_from(ProductionHistory)) or 0)
        asset_count = int(
            db.scalar(
                select(func.count(func.distinct(ProductionHistory.asset_id)))
            ) or 0
        )
        registered_assets = int(db.scalar(select(func.count()).select_from(Asset)) or 0)

        start, end = db.execute(
            select(
                func.min(ProductionHistory.timestamp),
                func.max(ProductionHistory.timestamp),
            )
        ).one()

        missingness: dict[str, int] = {"asset_id": 0, "timestamp": 0, "production": 0}
        for col in ("pressure", "temperature", "flow_rate", "valve_status"):
            column = getattr(ProductionHistory, col)
            missingness[col] = int(
                db.scalar(
                    select(func.count()).select_from(ProductionHistory).where(column.is_(None))
                ) or 0
            )
        missingness["source"] = int(
            db.scalar(
                select(func.count())
                .select_from(ProductionHistory)
                .where(ProductionHistory.source.is_(None))
            ) or 0
        )
        missingness["source_type"] = 0  # NOT NULL + CHECK constrained

        duplicate_subquery = (
            select(
                ProductionHistory.asset_id,
                ProductionHistory.timestamp,
                func.count().label("cnt"),
            )
            .group_by(ProductionHistory.asset_id, ProductionHistory.timestamp)
            .having(func.count() > 1)
            .subquery()
        )
        duplicate_count = int(
            db.scalar(
                select(func.coalesce(func.sum(duplicate_subquery.c.cnt - 1), 0))
                .select_from(duplicate_subquery)
            ) or 0
        )

        source_distribution_rows = db.execute(
            select(
                func.coalesce(ProductionHistory.source, "(none)").label("src"),
                func.count(),
            ).group_by(func.coalesce(ProductionHistory.source, "(none)"))
        ).all()
        source_type_distribution_rows = db.execute(
            select(ProductionHistory.source_type, func.count())
            .group_by(ProductionHistory.source_type)
        ).all()

        from app.models import AIPSScore, Anomaly, Forecast

        derived_artifacts = {
            "forecasts": int(db.scalar(select(func.count()).select_from(Forecast)) or 0),
            "anomalies": int(db.scalar(select(func.count()).select_from(Anomaly)) or 0),
            "aips_scores": int(db.scalar(select(func.count()).select_from(AIPSScore)) or 0),
        }

        return {
            "number_of_rows": total_rows,
            "assets": asset_count,
            "registered_assets": registered_assets,
            "date_range": {
                "start": start.isoformat() if start else None,
                "end": end.isoformat() if end else None,
            },
            "missingness": missingness,
            "duplicate_count": duplicate_count,
            "source_distribution": {src: int(n) for src, n in source_distribution_rows},
            "source_type_distribution": {st: int(n) for st, n in source_type_distribution_rows},
            "derived_artifacts": derived_artifacts,
        }
