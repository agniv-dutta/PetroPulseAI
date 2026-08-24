from datetime import date, datetime, timezone

from sqlalchemy import JSON, Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Asset(Base):
    __tablename__ = "assets"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    field: Mapped[str] = mapped_column(String(120))
    basin: Mapped[str] = mapped_column(String(120))
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    onstream_year: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(24), default="ACTIVE")
    baseline_qi: Mapped[float] = mapped_column(Float)  # initial rate, bbl/d
    baseline_di: Mapped[float] = mapped_column(Float)  # nominal decline /month
    baseline_b: Mapped[float] = mapped_column(Float)  # Arps exponent
    operating_cost_usd_m: Mapped[float] = mapped_column(Float, default=1.0)
    intervention_cost_usd_m: Mapped[float] = mapped_column(Float, default=1.0)

    production: Mapped[list["MonthlyProduction"]] = relationship(
        back_populates="asset", cascade="all, delete-orphan", order_by="MonthlyProduction.period"
    )


class MonthlyProduction(Base):
    __tablename__ = "monthly_production"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    asset_id: Mapped[str] = mapped_column(ForeignKey("assets.id"), index=True)
    period: Mapped[date] = mapped_column(Date, index=True)  # first day of month
    oil_bbl_d: Mapped[float] = mapped_column(Float)
    expected_bbl_d: Mapped[float] = mapped_column(Float)
    gas_mmcf_d: Mapped[float] = mapped_column(Float, default=0.0)
    water_cut_pct: Mapped[float] = mapped_column(Float, default=0.0)

    source: Mapped[str] = mapped_column(String(16), default="DERIVED")  # REAL | SYNTHETIC | DERIVED
    provenance_id: Mapped[int | None] = mapped_column(ForeignKey("provenance_records.id"), nullable=True)

    asset: Mapped[Asset] = relationship(back_populates="production")


class ProvenanceRecord(Base):
    __tablename__ = "provenance_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    dataset_name: Mapped[str] = mapped_column(String(160))
    publisher: Mapped[str] = mapped_column(String(80))  # OGD | PPAC | DGH | INTERNAL
    data_class: Mapped[str] = mapped_column(String(16))  # REAL | SYNTHETIC | DERIVED
    url: Mapped[str | None] = mapped_column(Text, nullable=True)
    ingested_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    record_count: Mapped[int] = mapped_column(Integer, default=0)
    integrity_score: Mapped[float] = mapped_column(Float, default=1.0)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)


class ForecastRun(Base):
    __tablename__ = "forecast_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    asset_id: Mapped[str] = mapped_column(String(32), index=True)
    model_name: Mapped[str] = mapped_column(String(64))
    horizon_days: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    metrics: Mapped[dict] = mapped_column(JSON, default=dict)  # mae/rmse/r2/mape per backtest
    params: Mapped[dict] = mapped_column(JSON, default=dict)  # qi/di/b or GBM params
    series: Mapped[list] = mapped_column(JSON, default=list)  # forecast points
    feature_importance: Mapped[list] = mapped_column(JSON, default=list)


class AnomalyEvent(Base):
    __tablename__ = "anomaly_events"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    asset_id: Mapped[str] = mapped_column(String(32), index=True)
    detected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    window_start: Mapped[date] = mapped_column(Date)
    window_end: Mapped[date] = mapped_column(Date)
    severity: Mapped[str] = mapped_column(String(16))  # NORMAL|WATCH|ALERT|CRITICAL
    anomaly_score: Mapped[float] = mapped_column(Float)
    deviation_pct: Mapped[float] = mapped_column(Float)
    expected_bbl_d: Mapped[float] = mapped_column(Float)
    actual_bbl_d: Mapped[float] = mapped_column(Float)
    contributing_features: Mapped[list] = mapped_column(JSON, default=list)
    status: Mapped[str] = mapped_column(String(24), default="UNACKNOWLEDGED")


class ScoreRun(Base):
    __tablename__ = "score_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    asset_id: Mapped[str] = mapped_column(String(32), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    aips_score: Mapped[float] = mapped_column(Float)
    priority: Mapped[str] = mapped_column(String(16))
    breakdown: Mapped[dict] = mapped_column(JSON, default=dict)


class SimulationSession(Base):
    __tablename__ = "simulation_sessions"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    asset_id: Mapped[str] = mapped_column(String(32), index=True)
    scenario: Mapped[str] = mapped_column(String(32), default="NORMAL")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    ticks_sent: Mapped[int] = mapped_column(Integer, default=0)


class ModelRegistryEntry(Base):
    __tablename__ = "model_registry"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    name: Mapped[str] = mapped_column(String(80))
    task: Mapped[str] = mapped_column(String(80))
    algorithm: Mapped[str] = mapped_column(String(120))
    trained_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    metrics: Mapped[dict] = mapped_column(JSON, default=dict)
    status: Mapped[str] = mapped_column(String(24), default="READY")
