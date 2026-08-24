"""initial PetroPulse AI schema

Revision ID: c3f9a1d7e4b2
Revises:
Create Date: 2026-08-24 13:05:00.000000

Canonical schema: assets, production_history, forecasts, anomalies,
aips_scores, model_metrics, interventions, simulations,
simulation_observations, model_versions, data_sources.

- UUID primary keys everywhere.
- production_history / simulation_observations are TimescaleDB hypertables
  (PostgreSQL only; silently skipped on other dialects).
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision: str = "c3f9a1d7e4b2"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


SOURCE_TYPE_CHECK = "source_type IN ('REAL', 'SYNTHETIC', 'DERIVED')"


def _timescaledb_available(bind) -> bool:
    """True when running on PostgreSQL with the timescaledb extension usable."""
    if bind.dialect.name != "postgresql":
        return False
    query = text("SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'timescaledb')")
    if bind.execute(query).scalar():
        return True
    try:
        # Savepoint so a permission failure cannot abort the whole migration txn.
        with bind.begin_nested():
            bind.execute(text("CREATE EXTENSION IF NOT EXISTS timescaledb"))
    except Exception:  # noqa: BLE001 - any failure means "not available"
        pass
    return bool(bind.execute(query).scalar())


def upgrade() -> None:
    bind = op.get_bind()

    op.create_table(
        "assets",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("asset_id", sa.String(length=64), nullable=False),
        sa.Column("field_name", sa.String(length=120), nullable=False),
        sa.Column("basin", sa.String(length=120), nullable=False),
        sa.Column("status", sa.String(length=24), nullable=False),
        sa.Column("latitude", sa.Float(), nullable=False),
        sa.Column("longitude", sa.Float(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_assets_asset_id", "assets", ["asset_id"], unique=True)

    op.create_table(
        "production_history",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "asset_id",
            sa.String(length=64),
            sa.ForeignKey("assets.asset_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("production", sa.Float(), nullable=False),
        sa.Column("pressure", sa.Float(), nullable=True),
        sa.Column("temperature", sa.Float(), nullable=True),
        sa.Column("flow_rate", sa.Float(), nullable=True),
        sa.Column("valve_status", sa.String(length=16), nullable=True),
        sa.Column("source", sa.String(length=160), nullable=True),
        sa.Column("source_type", sa.String(length=16), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(SOURCE_TYPE_CHECK, name="ck_production_history_source_type"),
        sa.CheckConstraint(
            "valve_status IN ('OPEN', 'CLOSED', 'THROTTLED', 'UNKNOWN')",
            name="ck_production_history_valve_status",
        ),
        sa.PrimaryKeyConstraint("id", "timestamp"),
    )
    op.create_index("ix_production_history_asset_id", "production_history", ["asset_id"])
    op.create_index("ix_production_history_timestamp", "production_history", ["timestamp"])
    op.create_index("ix_production_history_source_type", "production_history", ["source_type"])
    op.create_index(
        "ix_production_history_asset_timestamp", "production_history", ["asset_id", "timestamp"]
    )

    op.create_table(
        "forecast",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column(
            "asset_id",
            sa.String(length=64),
            sa.ForeignKey("assets.asset_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("horizon_days", sa.Integer(), nullable=False),
        sa.Column("forecast_value", sa.Float(), nullable=False),
        sa.Column("model_type", sa.String(length=48), nullable=False),
        sa.Column("model_version", sa.String(length=32), nullable=False),
        sa.Column("mae", sa.Float(), nullable=True),
        sa.Column("rmse", sa.Float(), nullable=True),
        sa.Column("r2", sa.Float(), nullable=True),
        sa.Column("mape", sa.Float(), nullable=True),
        sa.Column("confidence", sa.Float(), nullable=True),
        sa.Column("forecast_date", sa.Date(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_forecast_asset_id", "forecast", ["asset_id"])
    op.create_index("ix_forecast_forecast_date", "forecast", ["forecast_date"])
    op.create_index("ix_forecast_model", "forecast", ["model_type", "model_version"])

    op.create_table(
        "anomaly",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column(
            "asset_id",
            sa.String(length=64),
            sa.ForeignKey("assets.asset_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.Column("anomaly_score", sa.Float(), nullable=False),
        sa.Column("severity", sa.String(length=16), nullable=False),
        sa.Column("production_deviation", sa.Float(), nullable=False),
        sa.Column("contributing_features", sa.JSON(), nullable=False),
        sa.Column("status", sa.String(length=24), nullable=False),
        sa.Column("explanation", sa.Text(), nullable=True),
        sa.Column("model_version", sa.String(length=32), nullable=False),
        sa.CheckConstraint(
            "severity IN ('NORMAL', 'WATCH', 'ALERT', 'CRITICAL')",
            name="ck_anomaly_severity",
        ),
        sa.CheckConstraint(
            "status IN ('UNACKNOWLEDGED', 'ACKNOWLEDGED', 'INVESTIGATING', "
            "'MONITORING', 'RESOLVED', 'FALSE_POSITIVE')",
            name="ck_anomaly_status",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_anomaly_asset_id", "anomaly", ["asset_id"])
    op.create_index("ix_anomaly_timestamp", "anomaly", ["timestamp"])
    op.create_index("ix_anomaly_severity", "anomaly", ["severity"])

    op.create_table(
        "aips_scores",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column(
            "asset_id",
            sa.String(length=64),
            sa.ForeignKey("assets.asset_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("score", sa.Float(), nullable=False),
        sa.Column("priority", sa.String(length=16), nullable=False),
        sa.Column("loss_magnitude", sa.Float(), nullable=True),
        sa.Column("anomaly_severity", sa.Float(), nullable=True),
        sa.Column("recovery_opportunity", sa.Float(), nullable=True),
        sa.Column("recovery_confidence", sa.Float(), nullable=True),
        sa.Column("intervention_complexity", sa.Float(), nullable=True),
        sa.Column("calculated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("model_version", sa.String(length=32), nullable=False),
        sa.CheckConstraint(
            "priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')",
            name="ck_aips_scores_priority",
        ),
        sa.CheckConstraint("score >= 0 AND score <= 100", name="ck_aips_scores_range"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_aips_scores_asset_id", "aips_scores", ["asset_id"])
    op.create_index("ix_aips_scores_score", "aips_scores", ["score"])
    op.create_index("ix_aips_scores_calculated_at", "aips_scores", ["calculated_at"])

    op.create_table(
        "model_metrics",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("model_name", sa.String(length=80), nullable=False),
        sa.Column("model_version", sa.String(length=32), nullable=False),
        sa.Column("metric_name", sa.String(length=48), nullable=False),
        sa.Column("metric_value", sa.Float(), nullable=False),
        sa.Column("evaluation_dataset", sa.String(length=120), nullable=False),
        sa.Column("sample_count", sa.Integer(), nullable=False),
        sa.Column("evaluated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_model_metrics_model_version", "model_metrics", ["model_name", "model_version"]
    )
    op.create_index("ix_model_metrics_evaluated_at", "model_metrics", ["evaluated_at"])

    op.create_table(
        "interventions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column(
            "asset_id",
            sa.String(length=64),
            sa.ForeignKey("assets.asset_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("intervention_type", sa.String(length=48), nullable=False),
        sa.Column("planned_date", sa.Date(), nullable=False),
        sa.Column("executed_date", sa.Date(), nullable=True),
        sa.Column("predicted_recovery", sa.Float(), nullable=True),
        sa.Column("actual_recovery", sa.Float(), nullable=True),
        sa.Column("success", sa.Boolean(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_interventions_asset_id", "interventions", ["asset_id"])

    op.create_table(
        "simulations",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("simulation_id", sa.String(length=40), nullable=False),
        sa.Column(
            "asset_id",
            sa.String(length=64),
            sa.ForeignKey("assets.asset_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("speed_multiplier", sa.Float(), nullable=False),
        sa.Column("scenario", sa.String(length=32), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("stopped_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_simulations_asset_id", "simulations", ["asset_id"])
    op.create_index("ix_simulations_simulation_id", "simulations", ["simulation_id"], unique=True)

    op.create_table(
        "simulation_observations",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "simulation_id",
            sa.String(length=40),
            sa.ForeignKey("simulations.simulation_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("production", sa.Float(), nullable=False),
        sa.Column("pressure", sa.Float(), nullable=True),
        sa.Column("temperature", sa.Float(), nullable=True),
        sa.Column("flow_rate", sa.Float(), nullable=True),
        sa.Column("anomaly_score", sa.Float(), nullable=True),
        sa.Column("aips_score", sa.Float(), nullable=True),
        sa.Column("severity", sa.String(length=16), nullable=True),
        sa.CheckConstraint(
            "severity IN ('NORMAL', 'WATCH', 'ALERT', 'CRITICAL') OR severity IS NULL",
            name="ck_simulation_observations_severity",
        ),
        sa.PrimaryKeyConstraint("id", "timestamp"),
    )
    op.create_index(
        "ix_simulation_observations_simulation_id",
        "simulation_observations",
        ["simulation_id"],
    )
    op.create_index("ix_simulation_observations_timestamp", "simulation_observations", ["timestamp"])
    op.create_index(
        "ix_simulation_observations_sim_timestamp",
        "simulation_observations",
        ["simulation_id", "timestamp"],
    )

    op.create_table(
        "model_versions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("code", sa.String(length=24), nullable=False),
        sa.Column("model_name", sa.String(length=80), nullable=False),
        sa.Column("version", sa.String(length=32), nullable=False),
        sa.Column("task", sa.String(length=80), nullable=True),
        sa.Column("algorithm", sa.String(length=120), nullable=True),
        sa.Column("hyperparameters", sa.JSON(), nullable=False),
        sa.Column("status", sa.String(length=24), nullable=False),
        sa.Column("registered_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.UniqueConstraint("model_name", "version", name="uq_model_versions_name_version"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_model_versions_code", "model_versions", ["code"], unique=True)

    op.create_table(
        "data_sources",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("source_name", sa.String(length=120), nullable=False),
        sa.Column("source_type", sa.String(length=16), nullable=False),
        sa.Column("dataset_name", sa.String(length=160), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("coverage", sa.String(length=160), nullable=False),
        sa.Column("update_frequency", sa.String(length=48), nullable=False),
        sa.Column("url", sa.String(length=512), nullable=True),
        sa.Column("last_updated", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(SOURCE_TYPE_CHECK, name="ck_data_sources_source_type"),
        sa.UniqueConstraint("source_name", "dataset_name", name="uq_data_sources_name_dataset"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_data_sources_source_type", "data_sources", ["source_type"])

    # ---------------------------------------------------------------- hypertables
    if _timescaledb_available(bind):
        for table, interval in (
            ("production_history", "30 days"),
            ("simulation_observations", "7 days"),
        ):
            bind.execute(
                text(
                    f"SELECT create_hypertable("
                    f"'{table}', 'timestamp', chunk_time_interval => INTERVAL '{interval}', "
                    f"migrate_data => true, if_not_exists => true)"
                )
            )


def downgrade() -> None:
    op.drop_index("ix_data_sources_source_type", table_name="data_sources")
    op.drop_table("data_sources")
    op.drop_index("ix_model_versions_code", table_name="model_versions")
    op.drop_table("model_versions")
    op.drop_index("ix_simulation_observations_sim_timestamp", table_name="simulation_observations")
    op.drop_index("ix_simulation_observations_timestamp", table_name="simulation_observations")
    op.drop_index(
        "ix_simulation_observations_simulation_id", table_name="simulation_observations"
    )
    op.drop_table("simulation_observations")
    op.drop_index("ix_simulations_simulation_id", table_name="simulations")
    op.drop_index("ix_simulations_asset_id", table_name="simulations")
    op.drop_table("simulations")
    op.drop_index("ix_interventions_asset_id", table_name="interventions")
    op.drop_table("interventions")
    op.drop_index("ix_model_metrics_evaluated_at", table_name="model_metrics")
    op.drop_index("ix_model_metrics_model_version", table_name="model_metrics")
    op.drop_table("model_metrics")
    op.drop_index("ix_aips_scores_calculated_at", table_name="aips_scores")
    op.drop_index("ix_aips_scores_score", table_name="aips_scores")
    op.drop_index("ix_aips_scores_asset_id", table_name="aips_scores")
    op.drop_table("aips_scores")
    op.drop_index("ix_anomaly_severity", table_name="anomaly")
    op.drop_index("ix_anomaly_timestamp", table_name="anomaly")
    op.drop_index("ix_anomaly_asset_id", table_name="anomaly")
    op.drop_table("anomaly")
    op.drop_index("ix_forecast_model", table_name="forecast")
    op.drop_index("ix_forecast_forecast_date", table_name="forecast")
    op.drop_index("ix_forecast_asset_id", table_name="forecast")
    op.drop_table("forecast")
    op.drop_index("ix_production_history_asset_timestamp", table_name="production_history")
    op.drop_index("ix_production_history_source_type", table_name="production_history")
    op.drop_index("ix_production_history_timestamp", table_name="production_history")
    op.drop_index("ix_production_history_asset_id", table_name="production_history")
    op.drop_table("production_history")
    op.drop_index("ix_assets_asset_id", table_name="assets")
    op.drop_table("assets")
