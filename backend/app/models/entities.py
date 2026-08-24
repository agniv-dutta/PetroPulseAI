"""Canonical PetroPulse AI database schema.

PostgreSQL + TimescaleDB first, SQLite-compatible for local dev/tests.

Design contracts:
- Every table uses a UUID primary key (`sqlalchemy.Uuid`, native UUID on PG,
  CHAR(32) on SQLite). Time-series tables additionally carry their time column
  in a composite primary key so they can be promoted to TimescaleDB
  hypertables (hypertable partition keys must be part of any unique/PK
  constraint).
- Data provenance is unambiguous: `source_type` is NOT NULL and constrained by
  CHECK to exactly REAL | SYNTHETIC | DERIVED everywhere it appears.
- Hypertable candidates (handled by migration, PG only):
    production_history(timestamp), simulation_observations(timestamp)
"""

import uuid
from datetime import date, datetime, timezone

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _uuid() -> uuid.UUID:
    return uuid.uuid4()


# Allowed provenance classes - shared by every source_type column.
_SOURCE_TYPE_CHECK = "source_type IN ('REAL', 'SYNTHETIC', 'DERIVED')"

_SEVERITY_CHECK = "severity IN ('NORMAL', 'WATCH', 'ALERT', 'CRITICAL')"
_PRIORITY_CHECK = "priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')"


class Asset(Base):
    """Physical producing asset / well-pad registered in the portfolio."""

    __tablename__ = "assets"
    __table_args__ = (Index("ix_assets_asset_id", "asset_id", unique=True),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=_uuid)
    asset_id: Mapped[str] = mapped_column(String(64), nullable=False)  # human code e.g. MH-07
    field_name: Mapped[str] = mapped_column(String(120), nullable=False)
    basin: Mapped[str] = mapped_column(String(120), nullable=False)
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="ACTIVE")
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow
    )


class ProductionHistory(Base):
    """Time-series production telemetry. TimescaleDB hypertable on `timestamp`.

    source_type semantics:
      REAL      - verbatim records from a published/operator dataset
      SYNTHETIC - generated for demonstration (never real telemetry)
      DERIVED   - computed/model output (e.g. backfilled or reconciled series)
    """

    __tablename__ = "production_history"
    __table_args__ = (
        CheckConstraint(_SOURCE_TYPE_CHECK, name="ck_production_history_source_type"),
        CheckConstraint(
            "valve_status IN ('OPEN', 'CLOSED', 'THROTTLED', 'UNKNOWN')",
            name="ck_production_history_valve_status",
        ),
        Index("ix_production_history_asset_id", "asset_id"),
        Index("ix_production_history_timestamp", "timestamp"),
        Index("ix_production_history_source_type", "source_type"),
        Index("ix_production_history_asset_timestamp", "asset_id", "timestamp"),
    )

    # Composite PK so the table can become a hypertable (partition key =
    # timestamp must participate in every unique constraint).
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=_uuid)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), primary_key=True)
    asset_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("assets.asset_id", ondelete="CASCADE"), nullable=False
    )
    production: Mapped[float] = mapped_column(Float, nullable=False)  # bbl/d oil rate
    pressure: Mapped[float | None] = mapped_column(Float)  # bar
    temperature: Mapped[float | None] = mapped_column(Float)  # degC
    flow_rate: Mapped[float | None] = mapped_column(Float)  # bbl/d total liquid
    valve_status: Mapped[str | None] = mapped_column(String(16))
    source: Mapped[str | None] = mapped_column(String(160))  # dataset/generator label
    source_type: Mapped[str] = mapped_column(String(16), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )


class Forecast(Base):
    """Single forecast point produced by a model run."""

    __tablename__ = "forecast"
    __table_args__ = (
        Index("ix_forecast_asset_id", "asset_id"),
        Index("ix_forecast_forecast_date", "forecast_date"),
        Index("ix_forecast_model", "model_type", "model_version"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=_uuid)
    asset_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("assets.asset_id", ondelete="CASCADE"), nullable=False
    )
    horizon_days: Mapped[int] = mapped_column(Integer, nullable=False)
    forecast_value: Mapped[float] = mapped_column(Float, nullable=False)  # bbl/d at forecast_date
    model_type: Mapped[str] = mapped_column(String(48), nullable=False)
    model_version: Mapped[str] = mapped_column(String(32), nullable=False, default="v1")
    mae: Mapped[float | None] = mapped_column(Float)
    rmse: Mapped[float | None] = mapped_column(Float)
    r2: Mapped[float | None] = mapped_column(Float)
    mape: Mapped[float | None] = mapped_column(Float)
    confidence: Mapped[float | None] = mapped_column(Float)  # [0,1]
    forecast_date: Mapped[date] = mapped_column(Date, nullable=False)  # target date of point
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )


class Anomaly(Base):
    """Detected anomaly event over production history."""

    __tablename__ = "anomaly"
    __table_args__ = (
        CheckConstraint(_SEVERITY_CHECK, name="ck_anomaly_severity"),
        CheckConstraint(
            "status IN ('UNACKNOWLEDGED', 'ACKNOWLEDGED', 'INVESTIGATING', "
            "'MONITORING', 'RESOLVED', 'FALSE_POSITIVE')",
            name="ck_anomaly_status",
        ),
        Index("ix_anomaly_asset_id", "asset_id"),
        Index("ix_anomaly_timestamp", "timestamp"),
        Index("ix_anomaly_severity", "severity"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=_uuid)
    asset_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("assets.asset_id", ondelete="CASCADE"), nullable=False
    )
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    anomaly_score: Mapped[float] = mapped_column(Float, nullable=False)  # [0,1]
    severity: Mapped[str] = mapped_column(String(16), nullable=False)
    production_deviation: Mapped[float] = mapped_column(Float, nullable=False)  # % vs expectation
    contributing_features: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="UNACKNOWLEDGED")
    explanation: Mapped[str | None] = mapped_column(Text)
    model_version: Mapped[str] = mapped_column(String(32), nullable=False, default="v1")


class AIPSScore(Base):
    """Asset Intervention Priority Score snapshot (one row per calculation)."""

    __tablename__ = "aips_scores"
    __table_args__ = (
        CheckConstraint(_PRIORITY_CHECK, name="ck_aips_scores_priority"),
        CheckConstraint("score >= 0 AND score <= 100", name="ck_aips_scores_range"),
        Index("ix_aips_scores_asset_id", "asset_id"),
        Index("ix_aips_scores_score", "score"),
        Index("ix_aips_scores_calculated_at", "calculated_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=_uuid)
    asset_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("assets.asset_id", ondelete="CASCADE"), nullable=False
    )
    score: Mapped[float] = mapped_column(Float, nullable=False)  # [0,100]
    priority: Mapped[str] = mapped_column(String(16), nullable=False)
    loss_magnitude: Mapped[float | None] = mapped_column(Float)  # normalized 0-100
    anomaly_severity: Mapped[float | None] = mapped_column(Float)  # normalized 0-100
    recovery_opportunity: Mapped[float | None] = mapped_column(Float)  # normalized 0-100
    recovery_confidence: Mapped[float | None] = mapped_column(Float)  # [0,1]
    intervention_complexity: Mapped[float | None] = mapped_column(Float)  # normalized 0-100
    calculated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )
    model_version: Mapped[str] = mapped_column(String(32), nullable=False, default="v1")


class ModelMetric(Base):
    """One evaluated metric sample for a model version (long/tidy format)."""

    __tablename__ = "model_metrics"
    __table_args__ = (
        Index("ix_model_metrics_model_version", "model_name", "model_version"),
        Index("ix_model_metrics_evaluated_at", "evaluated_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=_uuid)
    model_name: Mapped[str] = mapped_column(String(80), nullable=False)
    model_version: Mapped[str] = mapped_column(String(32), nullable=False)
    metric_name: Mapped[str] = mapped_column(String(48), nullable=False)  # mae/rmse/r2/...
    metric_value: Mapped[float] = mapped_column(Float, nullable=False)
    evaluation_dataset: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    sample_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    evaluated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )


class Intervention(Base):
    """Planned/executed well intervention with recovery tracking."""

    __tablename__ = "interventions"
    __table_args__ = (Index("ix_interventions_asset_id", "asset_id"),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=_uuid)
    asset_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("assets.asset_id", ondelete="CASCADE"), nullable=False
    )
    intervention_type: Mapped[str] = mapped_column(String(48), nullable=False)
    planned_date: Mapped[date] = mapped_column(Date, nullable=False)
    executed_date: Mapped[date | None] = mapped_column(Date)
    predicted_recovery: Mapped[float | None] = mapped_column(Float)  # MMbbl
    actual_recovery: Mapped[float | None] = mapped_column(Float)  # MMbbl
    success: Mapped[bool | None] = mapped_column(Boolean)
    notes: Mapped[str | None] = mapped_column(Text)


class Simulation(Base):
    """Synthetic telemetry simulation session (digital-twin scenario run)."""

    __tablename__ = "simulations"
    __table_args__ = (
        Index("ix_simulations_asset_id", "asset_id"),
        Index("ix_simulations_simulation_id", "simulation_id", unique=True),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=_uuid)
    simulation_id: Mapped[str] = mapped_column(String(40), nullable=False)  # hub session code
    asset_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("assets.asset_id", ondelete="CASCADE"), nullable=False
    )
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="RUNNING")
    speed_multiplier: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)
    scenario: Mapped[str] = mapped_column(String(32), nullable=False, default="NORMAL")
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )
    stopped_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class SimulationObservation(Base):
    """High-frequency observation emitted during a simulation run.

    TimescaleDB hypertable on `timestamp`.
    """

    __tablename__ = "simulation_observations"
    __table_args__ = (
        CheckConstraint(_SEVERITY_CHECK, name="ck_simulation_observations_severity"),
        Index("ix_simulation_observations_simulation_id", "simulation_id"),
        Index("ix_simulation_observations_timestamp", "timestamp"),
        Index("ix_simulation_observations_sim_timestamp", "simulation_id", "timestamp"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=_uuid)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), primary_key=True)
    simulation_id: Mapped[str] = mapped_column(
        String(40), ForeignKey("simulations.simulation_id", ondelete="CASCADE"), nullable=False
    )
    production: Mapped[float] = mapped_column(Float, nullable=False)
    pressure: Mapped[float | None] = mapped_column(Float)
    temperature: Mapped[float | None] = mapped_column(Float)
    flow_rate: Mapped[float | None] = mapped_column(Float)
    anomaly_score: Mapped[float | None] = mapped_column(Float)
    aips_score: Mapped[float | None] = mapped_column(Float)
    severity: Mapped[str | None] = mapped_column(String(16))


class ModelVersion(Base):
    """Registered model version (registry handle used across the platform)."""

    __tablename__ = "model_versions"
    __table_args__ = (
        Index("ix_model_versions_code", "code", unique=True),
        UniqueConstraint("model_name", "version", name="uq_model_versions_name_version"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=_uuid)
    code: Mapped[str] = mapped_column(String(24), nullable=False)  # registry handle e.g. MOD-01
    model_name: Mapped[str] = mapped_column(String(80), nullable=False)
    version: Mapped[str] = mapped_column(String(32), nullable=False, default="v1")
    task: Mapped[str | None] = mapped_column(String(80))
    algorithm: Mapped[str | None] = mapped_column(String(120))
    hyperparameters: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="READY")
    registered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )
    notes: Mapped[str | None] = mapped_column(Text)


class DataSource(Base):
    """Catalogue of datasets feeding the platform, with explicit provenance."""

    __tablename__ = "data_sources"
    __table_args__ = (
        CheckConstraint(_SOURCE_TYPE_CHECK, name="ck_data_sources_source_type"),
        Index("ix_data_sources_source_type", "source_type"),
        UniqueConstraint("source_name", "dataset_name", name="uq_data_sources_name_dataset"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=_uuid)
    source_name: Mapped[str] = mapped_column(String(120), nullable=False)
    source_type: Mapped[str] = mapped_column(String(16), nullable=False)
    dataset_name: Mapped[str] = mapped_column(String(160), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    coverage: Mapped[str] = mapped_column(String(160), nullable=False, default="")
    update_frequency: Mapped[str] = mapped_column(String(48), nullable=False, default="")
    url: Mapped[str | None] = mapped_column(String(512))
    last_updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )
