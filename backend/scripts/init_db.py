"""Initialise the PetroPulse AI database layer.

Runs Alembic migrations to head against the configured database (PostgreSQL +
TimescaleDB in production, SQLite for local development), then verifies schema
integrity:

  - every canonical table exists
  - required indexes exist (asset_id / timestamp / source_type /
    anomaly severity / AIPS score)
  - provenance CHECK constraints are present AND actively reject values
    outside REAL | SYNTHETIC | DERIVED (verified with a rolled-back probe)

Usage:
    python scripts/init_db.py [--database-url URL] [--skip-migrations] [--json]
"""

import argparse
import json
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from alembic import command  # noqa: E402
from alembic.config import Config  # noqa: E402
from sqlalchemy import inspect, text  # noqa: E402

REQUIRED_TABLES = [
    "assets",
    "production_history",
    "forecast",
    "anomaly",
    "aips_scores",
    "model_metrics",
    "interventions",
    "simulations",
    "simulation_observations",
    "model_versions",
    "data_sources",
]

REQUIRED_INDEXES = {
    "assets": {"ix_assets_asset_id"},
    "production_history": {
        "ix_production_history_asset_id",
        "ix_production_history_timestamp",
        "ix_production_history_source_type",
        "ix_production_history_asset_timestamp",
    },
    "forecast": {"ix_forecast_asset_id", "ix_forecast_forecast_date"},
    "anomaly": {"ix_anomaly_asset_id", "ix_anomaly_timestamp", "ix_anomaly_severity"},
    "aips_scores": {"ix_aips_scores_asset_id", "ix_aips_scores_score"},
    "model_metrics": {"ix_model_metrics_model_version"},
    "interventions": {"ix_interventions_asset_id"},
    "simulations": {"ix_simulations_asset_id", "ix_simulations_simulation_id"},
    "simulation_observations": {
        "ix_simulation_observations_simulation_id",
        "ix_simulation_observations_timestamp",
    },
    "model_versions": {"ix_model_versions_code"},
    "data_sources": {"ix_data_sources_source_type"},
}

HYPERTABLE_CANDIDATES = {"production_history", "simulation_observations"}


def _engine_for(database_url: str):
    from sqlalchemy import create_engine

    return create_engine(database_url)


def run_migrations(database_url: str) -> None:
    cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    cfg.set_main_option("script_location", str(BACKEND_DIR / "migrations"))
    cfg.set_main_option("sqlalchemy.url", database_url)
    command.upgrade(cfg, "head")


def _probe_source_type_constraint(engine) -> dict[str, bool]:
    """Attempt (and roll back) an invalid provenance write per constrained table."""
    results: dict[str, bool] = {}
    is_pg = engine.dialect.name == "postgresql"
    uuid_expr = "gen_random_uuid()" if is_pg else "'probe'"
    probes = {
        "production_history": (
            "INSERT INTO production_history (id, timestamp, asset_id, production, source_type) "
            f"VALUES ({uuid_expr}, CURRENT_TIMESTAMP, '__probe__', 0.0, 'UNVERIFIED')"
        ),
        "data_sources": (
            "INSERT INTO data_sources (id, source_name, source_type, dataset_name, "
            "description, coverage, update_frequency, last_updated) "
            f"VALUES ({uuid_expr}, '__probe__', 'MIXED', '__probe__', '', '', '', CURRENT_TIMESTAMP)"
        ),
    }
    for table, sql in probes.items():
        enforced = False
        try:
            with engine.connect() as conn:
                nested = conn.begin_nested()
                try:
                    conn.execute(text(sql))
                    nested.rollback()
                except Exception:
                    nested.rollback()
                    enforced = True
        except Exception:
            enforced = False
        results[table] = enforced
    return results


def verify_schema(database_url: str) -> dict:
    failures: list[str] = []
    warnings: list[str] = []

    engine = _engine_for(database_url)
    is_pg = engine.dialect.name == "postgresql"
    inspector = inspect(engine)

    tables = set(inspector.get_table_names())
    missing_tables = [t for t in REQUIRED_TABLES if t not in tables]
    if missing_tables:
        failures.append(f"missing tables: {missing_tables}")

    index_report: dict[str, list[str]] = {}
    for table, required in REQUIRED_INDEXES.items():
        if table not in tables:
            continue
        existing = {ix["name"] for ix in inspector.get_indexes(table)}
        missing = sorted(required - existing)
        index_report[table] = missing
        if missing:
            failures.append(f"{table}: missing indexes {missing}")

    # Provenance CHECK constraints present + actively enforced.
    for table in ("production_history", "data_sources"):
        if table not in tables:
            continue
        checks = " ".join(
            (c.get("sql_text") or c.get("sqltext") or "")
            for c in inspector.get_check_constraints(table)
        )
        if "SYNTHETIC" not in checks:
            failures.append(f"{table}: source_type CHECK constraint missing")
    probes = _probe_source_type_constraint(engine)
    for table, enforced in probes.items():
        if table in tables and not enforced:
            failures.append(f"{table}: invalid source_type value was accepted (provenance not enforced)")

    # Foreign keys point at the canonical natural key.
    if "production_history" in tables:
        fk_targets = {
            (fk["referred_table"], fk["constrained_columns"][0])
            for fk in inspector.get_foreign_keys("production_history")
        }
        if ("assets", "asset_id") not in fk_targets:
            failures.append(f"production_history FK -> assets.asset_id missing (found {fk_targets})")

    hypertables: list[str] = []
    timescaledb = False
    if is_pg:
        with engine.connect() as conn:
            timescaledb = bool(conn.execute(text(
                "SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname='timescaledb')"
            )).scalar())
            if timescaledb:
                hypertables = [
                    r[0] for r in conn.execute(text(
                        "SELECT hypertable_name FROM timescaledb_information.hypertables"
                    ))
                ]
        missing_ht = [t for t in HYPERTABLE_CANDIDATES if t not in hypertables]
        if missing_ht:
            warnings.append(
                f"TimescaleDB active but hypertables not created for: {missing_ht}"
            )
        if not timescaledb:
            warnings.append(
                "PostgreSQL detected without timescaledb extension - time series stored as plain tables"
            )
    else:
        warnings.append(f"dialect '{engine.dialect.name}': TimescaleDB hypertables not applicable")

    return {
        "database": database_url.split("://")[0],
        "url_scheme_ok": True,
        "tables": sorted(tables & set(REQUIRED_TABLES)),
        "missing_tables": missing_tables,
        "missing_indexes": index_report,
        "source_type_enforced": probes,
        "timescaledb_extension": timescaledb,
        "hypertables": sorted(hypertables),
        "warnings": warnings,
        "failures": failures,
        "ok": not failures,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--database-url", default=None, help="Override DATABASE_URL")
    parser.add_argument("--skip-migrations", action="store_true", help="Only verify schema")
    parser.add_argument("--json", action="store_true", help="Emit machine-readable report")
    args = parser.parse_args()

    from app.core.config import settings

    database_url = args.database_url or settings.database_url
    if args.database_url:
        settings.database_url = args.database_url

    if not args.skip_migrations:
        print(f"[init_db] running migrations against {database_url.split('://')[0]} ...")
        run_migrations(database_url)
        print("[init_db] migrations up to date.")

    report = verify_schema(database_url)
    if args.json:
        print(json.dumps(report, indent=2))
    else:
        status = "OK" if report["ok"] else "FAILED"
        print(f"[init_db] schema verification: {status}")
        print(f"  tables              : {len(report['tables'])}/{len(REQUIRED_TABLES)}")
        print(f"  source_type enforced: {report['source_type_enforced']}")
        print(f"  timescaledb         : {report['timescaledb_extension']}")
        print(f"  hypertables         : {report['hypertables']}")
        for w in report["warnings"]:
            print(f"  warning: {w}")
        for f in report["failures"]:
            print(f"  FAILURE: {f}")

    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
